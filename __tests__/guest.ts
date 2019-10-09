import {COMMUNICATION_CHANNEL_ID} from '../guest'

type TraceableFunction = ((...args: unknown[]) => void) & {calls: unknown[][]}
type ResultCollector<R> = ((event: MessageEvent) => void) & {results: R[]}

describe('guest', () => {
  it('should start a post message RPC server implementing the page proxy API', async () => {
    const callId = `call${Math.random()}`
    const attrValue = `val${Math.random()}`

    const replyListener = (() => {
      function listener(...args: unknown[]) {
        (listener as TraceableFunction).calls.push(args)
      }
      (listener as TraceableFunction).calls = []

      return listener as TraceableFunction
    })()
    const eventListener = (event: MessageEvent) => replyListener(event.data)
    addEventListener('message', eventListener)

    window.postMessage({
      channel: COMMUNICATION_CHANNEL_ID,
      data: {
        arguments: ['body', 'data-rpc-is-working', attrValue],
        callId,
        procedure: 'setAttribute',
      },
      messageId: 'msgId',
    }, '*')

    while (!document.body.hasAttribute('data-rpc-is-working')) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    expect(document.body.getAttribute('data-rpc-is-working')).toBe(attrValue)
    const resultReply = replyListener.calls.map(([message]) => message).filter(
      (message) => message && (message as any).data && (message as any).data.result,
    ).map((message) => (message as any).data.result)[0]
    expect(resultReply).toBe(1)

    removeEventListener('message', eventListener)
  })

  it('should allow checking the number of elements matching a CSS selector', async () => {
    const resultCollector = createResultCollector<number>()
    addEventListener('message', resultCollector)
    callPageProcedure('checkExistence', 'body')
    await awaitResultCount(resultCollector, 1)
    expect(resultCollector.results[0]).toBe(1)
    removeEventListener('message', resultCollector)
  })

  it('should allow getting a value of an attribute', async () => {
    const resultCollector = createResultCollector<string>()
    addEventListener('message', resultCollector)
    document.body.setAttribute('data-testing-attribute', 'a value to test for')
    callPageProcedure('getAttribute', 'body', 'data-testing-attribute')
    await awaitResultCount(resultCollector, 1)
    expect(resultCollector.results[0]).toBe('a value to test for')
    removeEventListener('message', resultCollector)
  })

  it('should allow removing an attribute', async () => {
    const resultCollector = createResultCollector<number>()
    addEventListener('message', resultCollector)
    document.body.setAttribute('data-attribute-to-remove', 'a value')
    callPageProcedure('removeAttribute', 'body', 'data-attribute-to-remove')
    await awaitResultCount(resultCollector, 1)
    expect(resultCollector.results[0]).toBe(1)
    expect(document.body.hasAttribute('data-attribute-to-remove')).toBe(false)
    removeEventListener('message', resultCollector)
  })

  it('should allow evaluating custom functions', async () => {
    const resultCollector = createResultCollector<number>()
    addEventListener('message', resultCollector)
    const value = -15 - Math.floor(Math.random() * 1000)
    callPageProcedure(
      'eval',
      `
        function someFunction() {
          var value = ${value}
          document.body.setAttribute('data-eval-result', 'value:' + value)
          return value
        }
      `,
    )
    await awaitResultCount(resultCollector, 1)
    expect(resultCollector.results[0]).toBe(value)
    expect(document.body.getAttribute('data-eval-result')).toBe(`value:${value}`)
    removeEventListener('message', resultCollector)
  })

  async function awaitResultCount(resultCollector: ResultCollector<unknown>, minResults: number): Promise<void> {
    while (resultCollector.results.length < minResults) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  function callPageProcedure(procedure: string, ...args: unknown[]): void {
    window.postMessage({
      channel: COMMUNICATION_CHANNEL_ID,
      data: {
        arguments: args,
        callId: 'callId',
        procedure,
      },
      messageId: 'msgId',
    }, '*')
  }

  function createResultCollector<R>(): ResultCollector<R> {
    const results = [] as R[]

    function listener(event: MessageEvent) {
      if (event && event.data && event.data.data && 'result' in event.data.data) {
        results.push(event.data.data.result)
      }
    }

    Object.defineProperty(listener, 'results', {
      enumerable: true,
      get(): R[] {
        return results
      },
    })

    return listener as ResultCollector<R>
  }
})
