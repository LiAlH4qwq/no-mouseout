"use strict";
const resultPass = (value) => ({
    pass: true,
    value,
    next: (f) => f(value),
    transError: (_) => resultPass(value)
});
const resultError = (error) => ({
    pass: false,
    error,
    next: (_) => resultError(error),
    transError: (f) => resultError(f(error))
});
const errorElementNotFound = () => "ElementNotFoundError";
const findElement = (on) => (selector) => {
    const rawResult = on.querySelector(selector);
    if (rawResult === null)
        return resultError(errorElementNotFound());
    return resultPass(rawResult);
};
const log = async (msg) => println(`[No Mouseout] ${msg}`);
const println = async (msg) => console.log(msg);
const sleep = (sec) => new Promise(resolve => setTimeout(() => resolve(), sec * 1000));
const waitElement = (sec) => (on) => (locator) => {
    const tryFirst = locator();
    if (tryFirst.pass)
        return Promise.resolve(tryFirst);
    const timer = sleep(sec)
        .then(_ => resultError(errorElementNotFound()));
    const waiter = new Promise(resolve => {
        const observer = new MutationObserver(_ => {
            const trying = locator();
            if (trying.pass) {
                observer.disconnect();
                resolve(trying);
            }
        });
        observer.observe(on, {
            childList: true,
            subtree: true
        });
    });
    return Promise.race([timer, waiter]);
};
const main = async (doc) => {
    fireMouseout(doc);
    notifyVideoFinish(doc);
};
const fireMouseout = async (doc) => {
    doc.addEventListener("mouseout", event => {
        event.stopPropagation();
    }, true);
    log("mouseout event fired!");
};
const notifyVideoFinish = async (doc) => {
    const body = doc.body;
    const findOnBody = findElement(body);
    const waitEle10sOnBody = waitElement(10)(body);
    const maybeIframeLevel1 = await waitEle10sOnBody(() => findOnBody("#iframe"));
    maybeIframeLevel1
        .next(iframeLevel1Elem => {
        const iframeLevel1 = iframeLevel1Elem;
        const docInnerLevel1 = iframeLevel1.contentDocument;
        if (docInnerLevel1 === null) {
            iframeLevel1.addEventListener("load", (_) => handleDocInnerLevel1(docInnerLevel1));
            log("Doc Inner Level 1 invalid, it may be still loading, tried adding an event listener");
        }
        else {
            handleDocInnerLevel1(docInnerLevel1);
        }
        return resultPass(iframeLevel1Elem);
    })
        .transError(error => {
        log("Iframe Level 1 not found!");
        return error;
    });
};
const handleDocInnerLevel1 = async (doc) => {
    log("Doc Inner Level 1 injected!");
    const body = doc.body;
    const findOnBody = findElement(body);
    const waitEle10sOnBody = waitElement(10)(body);
    const maybeIframeLevel2 = await waitEle10sOnBody(() => findOnBody("iframe"));
    maybeIframeLevel2
        .next(iframeLevel2Elem => {
        const iframeLevel2 = iframeLevel2Elem;
        const docInnerLevel2 = iframeLevel2.contentDocument;
        if (docInnerLevel2 === null) {
            iframeLevel2.addEventListener("load", (_) => handleDocInnerLevel2(docInnerLevel2));
            log("Doc Inner Level 2 invalid, it may be still loading, tried adding an event listener");
        }
        else {
            handleDocInnerLevel2(docInnerLevel2);
        }
        return resultPass(iframeLevel2Elem);
    })
        .transError(error => {
        log("Iframe Level 2 not found!");
        return error;
    });
};
const handleDocInnerLevel2 = async (doc) => {
    log("Doc Inner Level 2 injected!");
    const body = doc.body;
    const findOnBody = findElement(body);
    const waitEle10sOnBody = waitElement(10)(body);
    const maybeVideo = await waitEle10sOnBody(() => findOnBody("#video_html5_api"));
    await sleep(10);
    maybeVideo
        .next(videoElem => {
        const video = videoElem;
        video.play();
        video.volume = 0.01;
        video.addEventListener("ended", _ => {
            const banjiangIframe = document.createElement("iframe");
            banjiangIframe.src = "//music.163.com/outchain/player?type=2&id=2541479&auto=1";
            body.appendChild(banjiangIframe);
            log("tried injecting a banjiang music player!");
        });
        log("Video injected!");
        return resultPass(videoElem);
    })
        .transError(error => {
        log("Video not found!");
        return error;
    });
};
main(document);
