# karma-e2e

[![Build Status](https://travis-ci.org/jurca/karma-e2e.svg?branch=master)](https://travis-ci.org/jurca/karma-e2e)
[![npm](https://img.shields.io/npm/v/@jurca/karma-e2e.svg)](https://www.npmjs.com/package/@jurca/karma-e2e)
[![License](https://img.shields.io/npm/l/@jurca/karma-e2e.svg)](LICENSE)
![npm type definitions](https://img.shields.io/npm/types/@jurca/karma-e2e.svg)

Utility for E2E testing using karma. Utilizes wrapping the target page inside an
iframe, which requires (sometimes) disabling some iframe-related security of the
site, but does not require browser reconfiguration and thus should have better
cross-browser compatibility.

## Installation

```
npm install --save @jurca/karma-e2e
```

## Usage

### Tested website configuration

The `karma-e2e` library requires some modifications to the tested site so that
you won't have to disable/reconfigure security of the tested browser (you
usually have more control over your website you want to test than the browser
you want to use to run the tests).

That being said, it is strongly recommended to apply these modifications only
it running the E2E tests and never enable then in the production environment.
The recommended way is to enable these in non-production environment when the
website is accessed with shared secret key presented in the query parameters of
the website's URL.

The modifications are as follows:

* disable the [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
  iframe policy and the
  [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
  HTTP headers if your site uses them (if you care about security, it should).
  The `karma-e2e` library opens up your website inside an iframe (pop-ups are
  strongly restricted by current browsers), so this is a necessity to make sure
  your site would actually load.
* inject the `guest.js` file into the site. This will allow the `karma-e2e` to
  control your site.

### Usage in karma tests

While the `karma-e2e` library provides only a handful of APIs, it should be
enough to get you started with simple health check-style tests. Furthermore,
should you want to test more complex scenarios, you can either use the `eval()`
helper or send us a pull request with the new APIs.

The following snippets assume `karma` with `jasmine` and `karma-typescript`:

```typescript
import '@jurca/karma-e2e'

describe('website tests', () => {
  it('should work', async () => {
    // create a new iframe with the site we want to test
    const page = await newPage('http://localhost:8080/?e2e-key=secret', {
      navigationTimeout: 10_000, // milliseconds
      viewportWidth: 1240, // px
      viewportHeight: 1024, // px
      // If set to true, the newPage function will require the load event to
      // occur on the loaded page within the specified timeout. If omitted or
      // set to false, the page will be considered loaded after the navigation
      // timeout. It is recommend to have this flag set to false for pages
      // containing advertising, as adverts tend to be very flaky and may make
      // the load event never occur, even if the page itself is already loaded.
      // Defaults to false.
      strictNavigation: false
    })

    // We'll assume that we have a login link on our site if it has initialized
    // correctly.
    expect(await page.checkExistence('.login-link')).toBe(1)
    // The API is currently limited, so clicking the link has to be done using
    // eval(), which runs the provided function in the tested site's context.
    await page.eval(() => {
      document.querySelector('.login-link').dispatchEvent(
        new CustomEvent('click', {bubbles: true, cancelable: true}),
      )
    })
    // Has the login UI shown up?
    expect(
      await page.getAttribute('body', 'data-login-form-status'),
    ).toBe('visible')

    page.destroy()
  })
})
```

### API summary

#### newPage(siteUrl: string, options: {navigationTimeout: number, viewportWidth: number, viewportHeight: number,}): Promise&lt;IPageProxy&gt;

Creates a new iframe with the specified dimensions and attempts to navigate it
to the specified site URL within the given timeout. It is recommended to always
create a new `IPageProxy` instance using this function for every test and
dispose of it at the end of each test using its `destroy()` method.

#### IPageProxy

Interface describing the methods you may invoke to manipulate and/or inspect
the tested site.

#### IPageProxy.checkExistence(selector: string, timeout?: number): Promise<number>

Attempts to find at least one element matching the provided CSS selector within
the specified timeout. Results in the number of matched elements.

#### IPageProxy.setAttribute(selector: string, attribute: string, value: string, timeout?: number): Promise<number>

Sets the specified attribute to the provided all on all elements matching the
specified CSS selector. The method will re-attempt to do this until at least
one element is matched by the selector or the specified timeout expires.

#### IPageProxy.getAttribute(selector: string, attribute: string, timeout?: number): Promise<null | string>

Retrieves the value of the specified attribute on the first element matching
the specified CSS selector. The method will re-attempt to retrieve the value
until the first matched element has the specified attribute set or the
specified timeout expires.

#### IPageProxy.removeAttribute(selector: string, attribute: string, timeout?: number): Promise<number>

Removes the specified attribute from all elements matched by the specified CSS
selector. The method will re-attempt to do this until at least one element is
matched by the selector or the specified timeout expires.

#### IPageProxy.eval<R>(func: () => R | PromiseLike<R>): Promise<R>

Executes the provided function in the inspected site's context and resolves to
the function's return value. The function may be asynchronous or return a
promise, in which case the `eval()` will resolve to the returned promise's
result.

Note that functions cannot be shared between context natively, so the provided
function will be serialized to string using the `.toString()` method and
`eval`ed in the inspected site's context. While this prevents you to use any
local variable in the calling side's context in the provided function's body,
it grants you access to the global context of the inspected site from within
the function.
