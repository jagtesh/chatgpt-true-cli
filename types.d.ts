// sadly a global state for now
type Store = {
    puppeteer: {
        pageManager?: Page;
        browserManager?: Browser;
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
    [key: string]: any;
};

type NewChatResponse = {
    user: string;
    assistant: string;
};

type EmptyResponse = {};