// the visual tests run in the browser without the start server, so a server
// function has no endpoint to call. the handler of the function runs in the
// browser and reads the data over http from the server of the tests, which is
// the same path the browser of the application takes in development
export const createServerFn = () => ({
  handler: <TResult>(handler: () => TResult) => handler
});
