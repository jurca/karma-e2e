export type IPage = { // tslint:disable-line interface-over-type-literal
  checkExistence(selector: string, timeout?: number): Promise<number>,
  setAttribute(selector: string, attribute: string, value: string, timeout?: number): Promise<number>,
  getAttribute(selector: string, attribute: string, timeout?: number): Promise<null | string>,
  removeAttribute(selector: string, attribute: string, timeout?: number): Promise<number>,
}

export type IPageEvalProvider = { // tslint:disable-line interface-over-type-literal
  eval<R>(func: () => R): Promise<R>,
}

type IPageEvalImplementor = { // tslint:disable-line interface-over-type-literal
  eval<R>(funcSource: string): Promise<R>,
}

const DEFAULT_TIMEOUT = 10_000 // 10 seconds
const ATTEMPT_INTERVAL = 200 // milliseconds

export const PageImpl: IPage & IPageEvalImplementor = {
  checkExistence(selector: string, timeout: number = DEFAULT_TIMEOUT): Promise<number> {
    return runAttempts(
      () => selectElements(selector).length,
      (elementCount: number) => !!elementCount,
      ATTEMPT_INTERVAL,
      timeout,
    )
  },
  setAttribute(selector: string, attribute: string, value: string, timeout: number = DEFAULT_TIMEOUT): Promise<number> {
    return runAttempts(
      () => selectElements(selector).map((element) => element.setAttribute(attribute, value)).length,
      (elementCount: number) => !!elementCount,
      ATTEMPT_INTERVAL,
      timeout,
    )
  },
  getAttribute(selector: string, attribute: string, timeout: number = DEFAULT_TIMEOUT): Promise<null | string> {
    return runAttempts(
      () => {
        const elements = selectElements(selector)
        return elements.length ? elements[0].getAttribute(attribute) : null
      },
      (result: null | string) => {
        return result !== null
      },
      ATTEMPT_INTERVAL,
      timeout,
    )
  },
  removeAttribute(selector: string, attribute: string, timeout: number = DEFAULT_TIMEOUT): Promise<number> {
    return runAttempts(
      () => selectElements(selector).map((element) => element.removeAttribute(attribute)).length,
      (elementCount: number) => !!elementCount,
      ATTEMPT_INTERVAL,
      timeout,
    )
  },
  eval<R>(funcSource: string): Promise<R> {
    const result = eval(`(${funcSource})()`) // tslint:disable-line no-eval
    return Promise.resolve(result)
  },
}

export const PAGE_API_TEMPLATE = {
  checkExistence: null,
  eval: null,
  getAttribute: null,
  removeAttribute: null,
  setAttribute: null,
}

function selectElements(selector: string): Element[] {
  return Array.prototype.slice.call(document.querySelectorAll(selector))
}

async function runAttempts<R>(
  attemptCallback: () => R,
  successInvariant: (result: R) => boolean,
  retryDelay: number,
  timeout: number,
): Promise<R> {
  const start = performance.now()
  let lastResult = attemptCallback()

  do {
    if (successInvariant(lastResult)) {
      return lastResult
    }
    await delay(retryDelay)
    lastResult = attemptCallback()
  } while (performance.now() - start < timeout)

  return lastResult
}

function delay(delayTime: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayTime))
}
