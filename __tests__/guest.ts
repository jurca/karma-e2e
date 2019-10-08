import {COMMUNICATION_CHANNEL_ID} from '../guest'

type TraceableFunction = ((...args: unknown[]) => void) & {calls: unknown[][]}

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
})
