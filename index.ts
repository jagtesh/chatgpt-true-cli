/**
 * This file contains the main entry point of the application.
 * It initializes the necessary dependencies, defines the command line interface,
 * and starts the backend server.
 */
import puppeteer, { Browser } from 'puppeteer';
import { Command } from 'commander';
import { Elysia } from 'elysia';
import { sendMessageHandler } from './routes';
import chatgpt from './api/chatgpt';

var store: Store;

// Create a new command using the Command class
const program = new Command();


async function defaultInit() {
    // return a promise object for the broser
    // const browser = await puppeteer.launch({
    //     headless: 'new',
    //     // `headless: true` (default) enables old Headless;
    //     // `headless: 'new'` enables new Headless;
    //     // `headless: false` enables "headful" mode.
    // });
    const { browserManager, pageManager } = await chatgpt.createSession();
    store = {
        puppeteer: {
            browserManager,
            pageManager,
            auth: {
                username: process.env['CHATGPT_LOGIN'] || '',
                password: process.env['CHATGPT_PASSWORD'] || ''
            }
        }
    };

    await chatgpt.loadBaseURL(store);
    // login to chatgpt (might get asked to enter the 2FA code)
    // await chatgpt.login(store);
    // logged in now - session should be active and maintained in the server store
}


const isChatResponse = (response: any): response is NewChatResponse => typeof response.user === "string" && response.assistant === "string";



/**
 * Makes a post request to the server using http and retrieves the answer to a given question.
 * The server should be running on localhost:5234 and the endpoint should be /chat.
 * @param _options - The options object.
 * @param cmd - The command object.
 */
async function clientAsk(_options: any, cmd: Command) {
    // Make a post request to the server using http
    // The server should be running on localhost:5234
    // The endpoint should be /chat
    // The body should be the question
    // The response should be the answer
    const question = cmd.args.join("\n");
    console.debug("Command:", question);
    const response = await fetch('http://localhost:5234/chat', {
        method: 'PUT',
        body: JSON.stringify({ question }),
        headers: { 'Content-Type': 'application/json' }
    });
    console.debug(response)
    if (response && response.ok) {
        const result = await response.json();
        console.debug(result);
        console.log(result.assistant);
        return;
    }
    console.error(`!!!<HTTP ${response.status}>!!!\n`);
}

program
    .command('ask')
    .description('Ask ChatGPT')
    .action(clientAsk);


program
    .command('serve')
    .description('Start the backend server')
    .option('-l, --login [login]', 'Your email login for ChatGPT. Note: It is prefereable to pass that as an environment variable CHATGPT_LOGIN')
    .option('-p, --password [password]', 'Your login password for ChatGPT. Note: It is prefereable to pass that as an environment variable CHATGPT_PASSWORD')
    .action(startServer);


program
    .command('help', { isDefault: true })
    .action((options: any[], cmd: Command) => { program.outputHelp() });


async function startServer(options: object) {
    // create a new browser object and store it in browser
    defaultInit();
    const banner = "🐈 GPT Server | Server is running on port 5234";

    const app = new Elysia();
    app.store = store;

    app
        // .get('/chat', () => 'Get Chat by ID')
        .post('/chat', () => '{"user":"", "assistant":""}')//sendMessageHandler)
        .put('/chat', () => () => sendMessageHandler) //'{"user":"", "assistant":""}'
        // .delete('/chat', () => 'Delete Chat by ID')
        .onStart(() => console.info(banner))
        .listen(5234);


    // Handle the signals to stop the server
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGKILL']) {
        process.on(signal, async () => {
            app.stop();
            await store?.puppeteer?.browserManager?.close();
            console.error(`\nServer is being stopped by signal: ${signal}`);
        });
    }
}

// Parse the command line arguments
program.parse(process.argv);
// program.arguments