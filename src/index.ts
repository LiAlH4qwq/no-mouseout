type Result<V, E> = {
    pass: true
    value: V
    next: <T, A>(f: (value: V) => Result<T, A>) => Result<T, A>
    transError: <A>(f: (error: E) => A) => Result<V, never>
} | {
    pass: false
    error: E
    next: <T, A>(f: (value: V) => Result<T, A>) => Result<never, E>
    transError: <A>(f: (error: E) => A) => Result<never, A>
}
type ElementNotFoundError = "ElementNotFoundError"

type resultPass = <V>(value: V) => Result<V, never>
type resultError = <E>(error: E) => Result<never, E>
type errorElementNotFound = () => ElementNotFoundError
type findElement = (on: Element) => (selector: string) =>
    Result<Element, ElementNotFoundError>

type log = (msg: string) => Promise<void>
type println = (msg: string) => Promise<void>
type sleep = (sec: number) => Promise<void>
type waitElement = (sec: number) => (on: Element) =>
    (locator: () => Result<Element, ElementNotFoundError>) =>
        Promise<Result<Element, ElementNotFoundError>>

type docModifier = (doc: Document) => Promise<void>
type getNextCourse = (doc: Document) =>
    Promise<Result<HTMLSpanElement, ElementNotFoundError>>

const resultPass: resultPass = (value) => ({
    pass: true,
    value,
    next: (f) => f(value),
    transError: (_) => resultPass(value)
})

const resultError: resultError = (error) => ({
    pass: false,
    error,
    next: (_) => resultError(error),
    transError: (f) => resultError(f(error))
})

const errorElementNotFound: errorElementNotFound = () => "ElementNotFoundError"

const findElement: findElement = (on) => (selector) => {
    const rawResult = on.querySelector(selector)
    if (rawResult === null) return resultError(errorElementNotFound())
    return resultPass(rawResult)
}

const log: log = async (msg) => println(`[No Mouseout] ${msg}`)

const println: println = async (msg) => console.log(msg)

const sleep: sleep = (sec) =>
    new Promise(resolve => setTimeout(() => resolve(), sec * 1000))

const waitElement: waitElement = (sec) => (on) => (locator) => {
    const tryFirst = locator()
    if (tryFirst.pass) return Promise.resolve(tryFirst)
    const timer = sleep(sec)
        .then(_ => resultError(errorElementNotFound())) as
        Promise<Result<never, ElementNotFoundError>>
    const waiter = new Promise(resolve => {
        const observer = new MutationObserver(_ => {
            const trying = locator()
            if (trying.pass) {
                observer.disconnect()
                resolve(trying as Result<Element, never>)
            }
        })
        observer.observe(on, {
            childList: true,
            subtree: true
        })
    }) as Promise<Result<Element, never>>
    return Promise.race([timer, waiter])
}

const main: docModifier = async (doc) => {
    fireMouseout(doc)
    notifyVideoFinish(doc)
}

const fireMouseout: docModifier = async (doc) => {
    doc.addEventListener("mouseout", event => {
        event.stopPropagation();
    }, true)
    log("mouseout event fired!")
}

const notifyVideoFinish: docModifier = async (doc) => {
    const body = doc.body
    const findOnBody = findElement(body)
    const waitEle10sOnBody = waitElement(10)(body)
    const maybeIframeLevel1 = await waitEle10sOnBody(() => findOnBody("#iframe"))
    maybeIframeLevel1
        .next(iframeLevel1Elem => {
            const iframeLevel1 = iframeLevel1Elem as HTMLIFrameElement
            const docInnerLevel1 = iframeLevel1.contentDocument
            if (docInnerLevel1 === null) {
                iframeLevel1.addEventListener("load", (_) => handleDocInnerLevel1(docInnerLevel1 as unknown as Document))
                log("Doc Inner Level 1 invalid, it may be still loading, tried adding an event listener")
            } else {
                handleDocInnerLevel1(docInnerLevel1)
            }
            return resultPass(iframeLevel1Elem)
        })
        .transError(error => {
            log("Iframe Level 1 not found!")
            return error
        })
}

const handleDocInnerLevel1: docModifier = async (doc) => {
    log("Doc Inner Level 1 injected!")
    const body = doc.body
    const findOnBody = findElement(body)
    const waitEle10sOnBody = waitElement(10)(body)
    const maybeIframeLevel2 = await waitEle10sOnBody(() => findOnBody("iframe"))
    maybeIframeLevel2
        .next(iframeLevel2Elem => {
            const iframeLevel2 = iframeLevel2Elem as HTMLIFrameElement
            const docInnerLevel2 = iframeLevel2.contentDocument
            if (docInnerLevel2 === null) {
                iframeLevel2.addEventListener("load", (_) => handleDocInnerLevel2(docInnerLevel2 as unknown as Document))
                log("Doc Inner Level 2 invalid, it may be still loading, tried adding an event listener")
            } else {
                handleDocInnerLevel2(docInnerLevel2)
            }
            return resultPass(iframeLevel2Elem)
        })
        .transError(error => {
            log("Iframe Level 2 not found!")
            return error
        })
}

const handleDocInnerLevel2: docModifier = async (doc) => {
    log("Doc Inner Level 2 injected!")
    const body = doc.body
    const findOnBody = findElement(body)
    const waitEle10sOnBody = waitElement(10)(body)
    const maybeVideo = await waitEle10sOnBody(() => findOnBody("#video_html5_api"))
    await sleep(10)
    maybeVideo
        .next(videoElem => {
            const video = videoElem as HTMLVideoElement
            video.play()
            video.volume = 0.01
            video.addEventListener("ended", _ => {
                const banjiangIframe = document.createElement("iframe")
                banjiangIframe.src = "//music.163.com/outchain/player?type=2&id=2541479&auto=1"
                body.appendChild(banjiangIframe)
                log("tried injecting a banjiang music player!")
            })
            log("Video injected!")
            return resultPass(videoElem)
        })
        .transError(error => {
            log("Video not found!")
            return error
        })
}

main(document)
