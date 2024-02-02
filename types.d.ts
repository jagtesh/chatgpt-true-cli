// sadly a global state for now
type Store = {
    browser: Browser;
    login: string;
    password: string;
    puppeteer?: {
        pageManager: Page;
        browserManager: Browser;
        auth: {
            username: string;
            password: string;
        };
    };
};

type HandlerOptions = {
    store: Store;
    request?: Request;
    response?: Response;
    body?: string | object;
};

type NewChatResponse = {
    user: string;
    assistant: string;
};