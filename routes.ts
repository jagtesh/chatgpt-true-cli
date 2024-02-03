import { sendMessage }  from './api/chatgpt';

/**
 * Handles the sending of a message.
 * 
 * @param options - The handler options.
 * @returns A promise that resolves to a NewChatResponse or EmptyResponse.
 */
export async function sendMessageHandler(options: HandlerOptions) {
    console.debug("Body:", options.body);
    const result = options.body;
    console.log("Request:", typeof result);
    return '{"user":"", "assistant":""}';
    // if (options.request) {
    //     let request = await options?.request?.json();
    //     let question = request?.question;

    //     let responseText = await sendMessage(question, options.store);
    //     return { user: question, assistant: responseText };
    // }
    // // responses need to be stringified
    // return '{}';

}