// tslint:disable-next-line:no-namespace
declare namespace KarmaE2E {
  interface IPageOptions {
    viewportWidth: number
    viewportHeight: number
    navigationTimeout: number
  }

  type IPage = { // tslint:disable-line interface-over-type-literal
    checkExistence(selector: string, timeout?: number): Promise<number>,
    setAttribute(selector: string, attribute: string, value: string, timeout?: number): Promise<number>,
    getAttribute(selector: string, attribute: string, timeout?: number): Promise<null | string>,
    removeAttribute(selector: string, attribute: string, timeout?: number): Promise<number>,
  }

  type IPageEvalProvider = { // tslint:disable-line interface-over-type-literal
    eval<R>(func: () => R): Promise<R>,
  }

  interface IDestroyablePage {
    destroy(): void
  }

  type IPageProxy = IPage & IPageEvalProvider & IDestroyablePage

  type newPage = (siteUrl: string, options: IPageOptions) => Promise<IPageProxy>
}

interface Window { // tslint:disable-line interface-name
  newPage: KarmaE2E.newPage
}

declare const newPage: KarmaE2E.newPage
