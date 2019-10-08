describe('host', () => {
  it('should allow creating and connecting to pages and destroying them', async () => {
    const page = await createPage()
    expect(document.body.lastChild!.nodeName).toBe('IFRAME')
    const pageIframe = document.body.lastChild

    page.destroy()
    expect(document.body.lastChild).not.toBe(pageIframe)
  })

  it('should be able to perform an existence check for CSS selector-matched elements', async () => {
    const page = await createPage()
    expect(await page.checkExistence('body')).toBe(1)
    expect(await page.checkExistence('div.a-class')).toBe(2)
    page.destroy()
  })

  it('should allow setting and reading the attributes', async () => {
    const page = await createPage()
    const value = `value${Math.random()}`
    expect(await page.setAttribute('body', 'data-testing-attr', value)).toBe(1)
    expect(await page.getAttribute('body', 'data-testing-attr')).toBe(value)
    page.destroy()
  })

  it('should allow removing attributes', async () => {
    const page = await createPage()
    expect(await page.removeAttribute('.a-class', 'class')).toBe(2)
    expect(await page.checkExistence('.a-class')).toBe(1)
    page.destroy()
  })

  it('should allow evaluating custom code', async () => {
    const page = await createPage()
    // We're using a dynamically constructed code, due to code coverage checks issues
    expect(await page.eval(new Function('return 1 + 2 + 3') as any)).toBe(6)
    page.destroy()
  })

  it('should reject invalid page options', () => {
    expect(() => {
      return newPage('', {
        navigationTimeout: 0,
        viewportHeight: 560,
        viewportWidth: 320,
      })
    }).toThrow()
    expect(() => {
      return newPage('', {
        navigationTimeout: 10.5,
        viewportHeight: 560,
        viewportWidth: 320,
      })
    }).toThrow()

    expect(() => {
      return newPage('', {
        navigationTimeout: 10_000,
        viewportHeight: 0,
        viewportWidth: 320,
      })
    }).toThrow()
    expect(() => {
      return newPage('', {
        navigationTimeout: 10_000,
        viewportHeight: 15.3,
        viewportWidth: 320,
      })
    }).toThrow()

    expect(() => {
      return newPage('', {
        navigationTimeout: 10_000,
        viewportHeight: 560,
        viewportWidth: 0,
      })
    }).toThrow()
    expect(() => {
      return newPage('', {
        navigationTimeout: 10_000,
        viewportHeight: 560,
        viewportWidth: 500.1,
      })
    }).toThrow()
  })

  function createPage() {
    return newPage('base/__tests__/mock-guest.html', {
      navigationTimeout: 10_000,
      viewportHeight: 560,
      viewportWidth: 320,
    })
  }
})
