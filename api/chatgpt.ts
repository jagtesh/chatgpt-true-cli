// import puppeteer from "puppeteer";
import type { Page, ElementHandle } from "puppeteer";
import fs from "fs";
import os from "os";

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

const PUPPETEER_DATA = `${os.homedir()}/.config/puppeteer`;
const CHATGPT_BASEURL = "http://chat.openai.com";

// const visitNewPage = async url => await structuredClone.browser.newPage() && await page.goto(url);

export async function createSession() {
    // Make the puppeteer browser data folder - this preserves the login session
    if (!fs.existsSync(PUPPETEER_DATA)) {
        fs.mkdirSync(PUPPETEER_DATA);
    }
    puppeteer.use(StealthPlugin());
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: PUPPETEER_DATA,
    });

    //const context = await browser.createIncognitoBrowserContext();

    const page: Page = await browser.newPage();
    // set custom headers to mimic a real browser
    await page.setExtraHTTPHeaders({
        referer: "www.google.com",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        cookie: "prov=4268ad2a-4c02-3986-b062-d16504ebca7a; usr=p=%5b10%7c15%5d%5b160%7c%3bBest%3b%5d",
    });
    return { pageManager: page, browserManager: browser };
}

export async function loadBaseURL(store: Store) {
    if (!store.puppeteer) return "NOT_INITIALIZED";
    const { pageManager } = store.puppeteer;
    await pageManager.goto(CHATGPT_BASEURL);
}

export async function login(store: Store) {
    if (!store.puppeteer) return "NOT_INITIALIZED";
    const { pageManager, browserManager, auth } = store.puppeteer;
    const page = pageManager;
    await page.goto(`${CHATGPT_BASEURL}/auth/login`);

    await waitTimeout(2200);
    const btnLogin = await page.waitForXPath(
        '//*[@id="__next"]/div[1]/div[2]/div[1]/div/div/button[1]',
    );

    btnLogin?.press("Enter");

    let statusCloudflare = await checkCloudflare(page);

    if (statusCloudflare) {
        while (statusCloudflare) {
            console.log("Cloudflare detected!");
            await waitTimeout(3000);
            statusCloudflare = await checkCloudflare(page);
        }
    }

    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', auth.username, { delay: 150 });
    await page.waitForXPath(
        "/html/body/div/main/section/div/div/div/div[1]/div/form/div[2]/button",
    );

    await waitTimeout(1700);
    let continueLogin = await page.$x(
        "/html/body/div/main/section/div/div/div/div[1]/div/form/div[2]/button",
    );
    if (continueLogin && continueLogin.length > 0) {
        continueLogin[0].press("Enter");
    }

    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', auth.password, { delay: 150 });

    await page.waitForXPath(
        "/html/body/div[1]/main/section/div/div/div/form/div[2]/button",
    );
    await waitTimeout(1700);
    ///html/body/div[1]/main/section/div/div/div/form/div[2]/button
    let login = await page.$x(
        "/html/body/div[1]/main/section/div/div/div/form/div[2]/button",
    );
    login[0]?.press("Enter");

    await waitTimeout(30000);
    let statusLogin = await validateLogin(page);

    if (statusLogin) {
        await waitTimeout(1800);
        return true;
    } else {
        return null;
    }
}

async function waitTimeout(time: number) {
    await new Promise((resolve) => setTimeout(resolve, time));
}

async function checkCloudflare(page: Page) {
    try {
        await page.waitForSelector('form[id="challenge-form"]');
        return true;
    } catch (error) {
        return false;
    }
}

async function validateLogin(page: Page) {
    try {
        await page.waitForSelector('textarea[id="prompt-textarea"]');
        return true;
    } catch (error) {
        return false;
    }
}

async function hasInternet() {
    try {
        const response = await fetch("https://www.google.com");
        return true;
    } catch (error) {
        return false;
    }
}

export async function checkErrorNetwork(store: Store) {
    if (!store.puppeteer) return "NOT_INITIALIZED";

    const { pageManager } = store.puppeteer;
    const document = pageManager.document;
    const networkError = await pageManager.evaluate(() => {
        try {
            return document
                .evaluate(
                    '//div[@class="flex-1 overflow-hidden"]//div[p]',
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null,
                )
                .singleNodeValue.attributes.class.nodeValue.includes(
                    "text-red",
                );
        } catch (error) {
            return false;
        }
    });

    if (networkError) {
        //init ping
        let ping = await hasInternet();

        let retries = 0;

        while (!ping) {
            if (retries > 12) {
                break;
            }

            retries++;

            console.log("Probando conexión a internet");
            ping = await hasInternet();

            if (ping) {
                break;
            }

            await waitTimeout(10000);
        }

        if (!ping) {
            return false;
        }

        try {
            let regenerate_btn = await pageManager.$x(
                '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/div[1]/div[2]/button',
            );

            regenerate_btn[0].click();

            return true;
        } catch (error) {
            console.log("Fail to regenerate");
            return false;
        }
    } else {
        console.log("No error element found");
        return "NO_ELEMENT";
    }
}

export async function sendMessage(message: string, store: Store) {
    if (!store.puppeteer) return "NOT_INITIALIZED";
    const { pageManager, browserManager } = store.puppeteer;
    await pageManager.$eval(
        'textarea[id="prompt-textarea"]',
        (el: any, value: any) => (el.value = value),
        message,
    );

    await waitTimeout(1200);

    await pageManager.type('textarea[id="prompt-textarea"]', " ");

    await waitTimeout(1700);
    let pageClicked = true;

    try {
        let submit_msg = await pageManager.$x(
            '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/form/div/div[2]/div/button',
        );
        submit_msg[0].click();
    } catch (error) {
        try {
            let submit_msg = await pageManager.$x(
                '//*[@id="__next"]/div[1]/div/main/div[1]/div[2]/form/div/div/div/button',
            );
            submit_msg[0].click();
        } catch (error) {
            try {
                let submit_msg = await pageManager.$x(
                    '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/form/div/div/div/button',
                );
                submit_msg[0].click();
            } catch (error) {
                console.log("Fail to send message");
            }
        }
    }

    try {
        await pageManager.waitForSelector(".result-streaming", {
            timeout: 60000,
        });
    } catch (error) {
        let status_network = await checkErrorNetwork(store);

        if (status_network === false) {
            console.log("Network error waiting for selector");
            await browserManager.close();
            return false;
        } else if (status_network === "NO_ELEMENT") {
            await pageManager.reload();

            try {
                await pageManager.waitForSelector(
                    'textarea[id="prompt-textarea"]',
                    {
                        timeout: 30000,
                    },
                );

                await pageManager.$eval(
                    'textarea[id="prompt-textarea"]',
                    (el: any, value: any) => (el.value = value),
                    message,
                );

                await waitTimeout(1200);

                await pageManager.type('textarea[id="prompt-textarea"]', " ");

                try {
                    let submit_msg = await pageManager.$x(
                        '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/form/div/div[2]/div/button',
                    );

                    submit_msg[0].click();
                } catch (error) {
                    try {
                        let submit_msg = await pageManager.$x(
                            '//*[@id="__next"]/div[1]/div/main/div[1]/div[2]/form/div/div/div/button',
                        );

                        submit_msg[0].click();
                    } catch (error) {
                        try {
                            let submit_msg = await pageManager.$x(
                                '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/form/div/div/div/button',
                            );

                            submit_msg[0].click();
                        } catch (error) {
                            console.log("Fail to send message");
                        }
                    }
                }
            } catch (error) {
                console.log("Fail to reload page " + error);
                return false;
            }
        }
    }

    let retries_network = 0;

    while (true) {
        try {
            pageClicked = await pageManager.evaluate(() => {
                return !!document.querySelector(".result-streaming");
            });

            if (!pageClicked) {
                await waitTimeout(1300);
                break;
            }
        } catch (error) {
            if (retries_network > 2) {
                console.log("Network error waiting for response");
                await browserManager.close();
                return false;
            }

            let status_network = await checkErrorNetwork(store);

            if (status_network === false) {
                continue;
            } else if (status_network === "NO_ELEMENT") {
                await pageManager.reload();

                try {
                    await pageManager.waitForSelector(
                        'textarea[id="prompt-textarea"]',
                        {
                            timeout: 30000,
                        },
                    );

                    await pageManager.$eval(
                        'textarea[id="prompt-textarea"]',
                        (el: any, value: any) => (el.value = value),
                        message,
                    );

                    await waitTimeout(1200);

                    await pageManager.type(
                        'textarea[id="prompt-textarea"]',
                        " ",
                    );

                    try {
                        let submit_msg = await pageManager.$x(
                            '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/form/div/div[2]/div/button',
                        );

                        submit_msg[0].click();
                    } catch (error) {
                        try {
                            let submit_msg = await pageManager.$x(
                                '//*[@id="__next"]/div[1]/div/main/div[1]/div[2]/form/div/div/div/button',
                            );

                            submit_msg[0].click();
                        } catch (error) {
                            try {
                                let submit_msg = await pageManager.$x(
                                    '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/form/div/div/div/button',
                                );

                                submit_msg[0].click();
                            } catch (error) {
                                console.log("Fail to send message");
                            }
                        }
                    }
                } catch (error) {
                    console.log("Fail to reload page " + error);
                    return false;
                }
            }
            retries_network++;
        }
    }

    const elements = await pageManager.$$(".markdown");

    let elementsText = [];

    for (const element of elements) {
        const elementText = await pageManager.evaluate(
            (element: { textContent: any }) => element.textContent,
            element,
        );
        elementsText.push(elementText);
    }

    return elementsText[elementsText.length - 1];
}

export async function stillLoggedIn(store: Store) {
    if (!store.puppeteer) return "NOT_INITIALIZED";

    const { pageManager } = store.puppeteer;

    try {
        await pageManager.waitForSelector('textarea[id="prompt-textarea"]');
        return true;
    } catch (error) {
        return false;
    }
}

export default {
    createSession,
    login,
    loadBaseURL,
    sendMessage,
    stillLoggedIn,
};
