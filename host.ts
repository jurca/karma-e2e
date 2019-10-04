import {createClient as createRpcClient} from '@jurca/post-message-rpc'
import {COMMUNICATION_CHANNEL_ID} from './guest'
import {IPage, IPageEvalProvider, PAGE_API_TEMPLATE} from './Page'

interface IPageOptions {
  viewportWidth: number
  viewportHeight: number
  navigationTimeout: number
}

interface IDestroyablePage {
  destroy(): void
}

type IPageProxy = IPage & IPageEvalProvider & IDestroyablePage

export function newPage(
  siteUrl: string,
  options: IPageOptions,
): Promise<IPageProxy> {
  if (Math.floor(options.viewportWidth) !== options.viewportWidth || options.viewportWidth <= 0) {
    throw new TypeError(`The viewportWidth option must be a positive integer, ${options.viewportWidth} was provided`)
  }
  if (Math.floor(options.viewportHeight) !== options.viewportHeight || options.viewportHeight <= 0) {
    throw new TypeError(`The viewportHeight option must be a positive integer, ${options.viewportHeight} was provided`)
  }
  if (Math.floor(options.navigationTimeout) !== options.navigationTimeout || options.navigationTimeout <= 0) {
    throw new TypeError(
      `The navigationTimeout option must be a positive integer, ${options.navigationTimeout} was provided`,
    )
  }

  const clientFrame = document.createElement('iframe')
  clientFrame.style.border = 'none'
  clientFrame.style.width = `${options.viewportWidth}px`
  clientFrame.style.height = `${options.viewportHeight}px`

  return new Promise((resolve, reject) => {
    const navigationTimeoutId = setTimeout(() => {
      const timeoutError = new Error(
        `The navigation to ${siteUrl} timed out after ${options.navigationTimeout} milliseconds`,
      )
      timeoutError.name = 'TimeoutError'
      reject(timeoutError)
    }, options.navigationTimeout)
    clientFrame.addEventListener('load', () => {
      clearTimeout(navigationTimeoutId)
      resolve()
    })
    clientFrame.addEventListener('error', (event: ErrorEvent) => {
      clearTimeout(navigationTimeoutId)
      reject(event.error || new Error(`Navigation to ${siteUrl} failed for unknown reason`))
    })
    clientFrame.src = siteUrl
    document.body.appendChild(clientFrame)
  }).then(() => {
    if (!clientFrame.contentWindow) {
      throw new Error(`The ${siteUrl} site failed to load`)
    }

    return createRpcClient<IPage & IPageEvalProvider>(
      clientFrame.contentWindow,
      {channel: COMMUNICATION_CHANNEL_ID},
      PAGE_API_TEMPLATE,
    )
  }).then((page) => {
    const destroyablePage: IPageProxy = page as IPageProxy
    const evalInvoker = destroyablePage.eval
    destroyablePage.eval = <R>(func: () => R): Promise<R> => {
      // Functions cannot be cloned, so we have to serialize them to their source code. Because of this, all functions
      // passed to eval must not use their origin's context.
      return evalInvoker(func.toString() as any)
    }
    destroyablePage.destroy = () => {
      if (clientFrame.parentNode) {
        clientFrame.parentNode.removeChild(clientFrame)
        clientFrame.src = 'about:blank'
      }
    }
    return destroyablePage
  })
}
