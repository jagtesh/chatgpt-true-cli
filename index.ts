import puppeteer, { Browser } from 'puppeteer';
import { Command } from 'commander';
import { Elysia } from 'elysia';
import { newChat } from './routes';

var store: Store;

// Create a new command using the Command class
const program = new Command();


async function defaultInit() {
  // return a promise object for the broser
  const browser = await puppeteer.launch({
    headless: 'new',
    // `headless: true` (default) enables old Headless;
    // `headless: 'new'` enables new Headless;
    // `headless: false` enables "headful" mode.
  });

  store = {
    browser,
    login: process.env['CHATGPT_LOGIN'] || '',
    password: process.env['CHATGPT_PASSWORD'] || ''
  };
}

async function clientAsk(_options: any, cmd: Command) {
  // Make a post request to the server using http
  // The server should be running on localhost:5234
  // The endpoint should be /chat
  // The body should be the question
  // The response should be the answer
  const question = cmd.args.join("\n");
  console.log("Command:", question);
  const response = await fetch('http://localhost:5234/chat', {
    method: 'POST',
    body: JSON.stringify({ question }),
    headers: { 'Content-Type': 'application/json' }
  });
  if (response && response.ok) {
    const result = await response.json() as NewChatResponse;
    if (typeof result.assistant !== "undefined") { console.log(result.assistant); }
    else { console.error(`Invalid data <HTTP ${response.status}>`); }
  } else {
    console.error(`Got <HTTP ${response.status}>`);
  }
}

program
  .command('ask')
  .description('Ask a question to ChatGPT')
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
    .get('/chat', () => 'Get Chat by ID')
    .post('/chat', newChat)
    .put('/chat', () => 'Post a new message to Chat')
    .delete('/chat', () => 'Delete Chat by ID')
    .onStart(() => console.info(banner))
    .listen(5234);


  // Handle the signals to stop the server
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGKILL']) {
    process.on(signal, async () => {
      app.stop();
      await store.browser?.close();
      console.error(`\nServer is being stopped by signal: ${signal}`);
    });
  }
}

// Parse the command line arguments
program.parse(process.argv);
// program.arguments