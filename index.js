'use strict';
const handlerPath = '../../node_modules/serverless-offline-direct-lambda/proxy.handler';
const handler = 'proxy.js';

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      "before:offline:start:init": this.startHandler.bind(this),
    };
  }

  startHandler() {
    let location = '';
    try {
      location = this.serverless.service.custom['serverless-offline'].location;
    } catch (_) { }

    this.serverless.cli.log('Running Serverless Offline with direct lambda support');

    addProxies(this.serverless.service.functions, location);
  }
}

const addProxies = (functionsObject, location) => {
  Object.keys(functionsObject).forEach(fn => {

    // filter out functions with event config,
    // leaving just those intended for direct lambda-to-lambda invocation
    const functionObject = functionsObject[fn];
    if (!functionObject.events || functionObject.events.length == 0) {
      const pf = functionProxy(functionObject, location);
      functionsObject[pf.name] = pf;
    }
  });
};

const functionProxy = (functionBeingProxied, location) => ({
  name: `${functionBeingProxied.name}_proxy`,
  handler: handlerPath,
  environment: functionBeingProxied.environment,
  events: [
    {
      http: {
        method: 'POST',
        path: `proxy/${functionBeingProxied.name}`,
        integration: 'lambda',
        request: {
          template: {
            'application/json': JSON.stringify(
              {
                location,
                body: "$input.json('$')",
                targetHandler :  functionBeingProxied.handler,
              }
            )
          }
        },
        response: {
          headers: {}
        }
      }
    }
  ],
  package: {
    include: [handler]
  }
});

module.exports = ServerlessPlugin;
