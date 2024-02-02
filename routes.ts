async function createSession({ store }: HandlerOptions) {
    console.log("Inside run")
    const page = await store.browser.newPage();
    await page.goto('https://developer.chrome.com/');


    let actionButton: any = await page.$('button[data-testid="login-button"]');
    await actionButton?.click();

    let form = await page.$('form[data-form-primary="true"]');
    let textInput = await form?.$('#username.input');
    textInput?.type(store.login);
    actionButton = await form?.$('button[type="submit"]');
    actionButton?.click();

    console.log(await page.title());
}

export async function newChat(options: HandlerOptions) {
    console.debug("Body:", options.body);
    const result = options.body;
    console.log("Request:", result);
    return { user: options.request, assistant: "<newchat> This is the default response. If you see this, hurray!" };
    // createSession(options);
}