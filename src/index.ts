import { Array, Console, Duration, Effect, Option } from "effect"

interface Cons<T> {
    new (...args: unknown[]): T
}

const main = (doc: Document) =>
    Effect.gen(function* () {
        yield* fireMouseout(doc)
        yield* videoAutoFinish(doc)
    })

const fireMouseout = (doc: Document) =>
    Effect.sync(() =>
        doc.addEventListener("mouseout", e => e.stopPropagation(), true),
    ).pipe(Effect.flatMap(_ => log("mouseout event fired!")))

const videoAutoFinish = (doc: Document) =>
    Effect.gen(function* () {
        const body = doc.body
        const waitEle10s = waitEle(10)
        const waitIf10sOnBody = waitEle10s(body)(HTMLIFrameElement)
        const iframeLevel1 = yield* waitIf10sOnBody("#iframe")
        yield* log("found iframe level 1!")
        const ifLv1W = yield* getConW(iframeLevel1)
        const waitIf10sOnIfLv1 = waitEle10s(ifLv1W.document.body)(
            ifLv1W.HTMLIFrameElement,
        )
        const iframeLevel2 = yield* waitIf10sOnIfLv1("iframe")
        yield* log("found iframe level 2")
        const ifLv2W = yield* getConW(iframeLevel2)
        const waitVd10sOnIfLv2 = waitEle10s(ifLv2W.document.body)(
            ifLv2W.HTMLVideoElement,
        )
        const video = yield* waitVd10sOnIfLv2("#video_html5_api")
        yield* log("found video")
        yield* Effect.sleep(Duration.seconds(10))
        const courses = yield* getCourses(doc)
        yield* addRefreshing(courses)
        yield* playVideo(video)
        yield* minVideoVol(video)
        yield* addEL(video)("ended")(_ =>
            Effect.gen(function* () {
                const bjIframe = doc.createElement("iframe")
                bjIframe.src =
                    "//music.163.com/outchain/player?type=2&id=2541479&auto=1"
                yield* addChild(body)(bjIframe)
                yield* log("injected a banjiang iframe!")
                yield* Effect.sleep(Duration.seconds(10))
                yield* getNextCourse(courses).pipe(Effect.flatMap(clickEle))
            }).pipe(Effect.runFork),
        )
        yield* log("video injected!")
    })

const addRefreshing = (courses: HTMLSpanElement[]) =>
    Effect.sync(() =>
        courses.map(course =>
            course.addEventListener("click", _ =>
                setTimeout(() => location.reload(), 10 * 1000),
            ),
        ),
    ).pipe(Effect.asVoid)

const getNextCourse = (courses: HTMLSpanElement[]) =>
    Array.findFirstIndex(
        courses,
        course =>
            course.parentElement?.classList.contains("posCatalog_active") ??
            false,
    ).pipe(
        Option.match({
            onNone: () => Effect.fail(eleNotFoundError()),
            onSome: curIndex => {
                if (curIndex >= courses.length - 1)
                    return Effect.fail(eleNotFoundError())
                return Effect.succeed(courses.at(curIndex + 1)!)
            },
        }),
    )

const getCourses = (doc: Document) =>
    waitEle(10)(doc.body)(HTMLDivElement)("#coursetree").pipe(
        Effect.flatMap(ls => findEles(ls)(HTMLSpanElement)(".posCatalog_name")),
    )

const log = (msg: string) =>
    Effect.succeed(msg).pipe(
        Effect.map(msg => `[No Mouseout] ${msg}`),
        Effect.flatMap(Console.log),
    )

const getConW = (iframe: HTMLIFrameElement) => {
    const t = iframe.contentWindow
    if (t === null) return Effect.fail(eleNotFoundError())
    return Effect.succeed(t as Window & typeof globalThis)
}

const minVideoVol = (video: HTMLVideoElement) =>
    Effect.sync(() => {
        video.volume = 0.01
    })

const playVideo = (video: HTMLVideoElement) =>
    Effect.promise(() => video.play())

const addEL =
    (ele: Element) => (eName: string) => (eL: (e: Event) => unknown) =>
        Effect.sync(() => ele.addEventListener(eName, eL))

const addChild = (on: Element) => (child: Element) =>
    Effect.sync(() => on.appendChild(child)).pipe(Effect.asVoid)

const clickEle = (ele: HTMLElement) => Effect.sync(() => ele.click())

const waitEle =
    (sec: number) =>
    (on: Element) =>
    <E extends Element>(what: Cons<E>) =>
    (sel: string) =>
        findEle(on)(what)(sel).pipe(
            Effect.orElse(() =>
                Effect.async<E, string>(resume => {
                    const f = () => {
                        const t = on.querySelector(sel)
                        if (t !== null && eleIs(what)(t))
                            resume(Effect.succeed(t))
                    }
                    const obs = new MutationObserver(_ => f())
                    obs.observe(on, {
                        childList: true,
                        subtree: true,
                    })
                    f()
                    return Effect.sync(() => obs.disconnect())
                }).pipe(
                    Effect.timeoutFail({
                        duration: Duration.seconds(sec),
                        onTimeout: () => eleNotFoundError(),
                    }),
                ),
            ),
        )

const findEles =
    (on: Element) =>
    <E extends Element>(what: Cons<E>) =>
    (sel: string) => {
        const ts = Array.fromIterable(on.querySelectorAll(sel))
        if (ts.length >= 1 && ts.every(eleIs(what))) return Effect.succeed(ts)
        return Effect.fail(eleNotFoundError())
    }

const findEle =
    (on: Element) =>
    <E extends Element>(what: Cons<E>) =>
    (sel: string) => {
        const t = on.querySelector(sel)
        if (t !== null && eleIs(what)(t)) return Effect.succeed(t)
        return Effect.fail(eleNotFoundError())
    }

const eleIs =
    <E extends Element>(cons: Cons<E>) =>
    (ele: Element): ele is E =>
        ele instanceof cons

const eleNotFoundError = () => "ElementNotFound"

main(document).pipe(Effect.runFork)
