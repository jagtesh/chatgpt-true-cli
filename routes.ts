import { createSession } from './api/chatgpt';

export async function newChat(options: HandlerOptions) {
    createSession(options);
    console.debug("Body:", options.body);
    const result = options.body;
    console.log("Request:", result);
    return { user: options.request, assistant: "<newchat> This is the default response. If you see this, hurray!" };
}