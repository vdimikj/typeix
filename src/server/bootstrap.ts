import {Injector} from "../injector/injector";
import {Logger} from "../logger/logger";
import {IncomingMessage, ServerResponse} from "http";
import {ControllerResolver} from "./request";
import {uuid, isArray} from "../core";
import {IModuleMetadata, IModule} from "../interfaces/imodule";
import {Metadata} from "../injector/metadata";
import {RouteResolver} from "./route-resolver";
import {parse} from "url";
import {IProvider} from "../interfaces/iprovider";

export const BOOTSTRAP_MODULE = "bootstrap";

/**
 * @since 1.0.0
 * @function
 * @name getModule
 * @param {Array<IModule>} modules
 * @param {String} name
 *
 * @description
 * Find root module
 */
export function getModule(modules: Array<IModule>, name: string = BOOTSTRAP_MODULE) {
  return modules.find(item => item.name === name);
}
/**
 * @since 1.0.0
 * @function
 * @name createModule
 * @param {Provider|Function} Class
 * @param {Injector} parent
 * @param {Provider|Function} exports
 *
 * @description
 * Bootstrap modules recursive
 */
export function createModule(Class: IProvider|Function, parent?: Injector, exports?: Array<IProvider|Function>): Array<IModule> {
  let modules = [];
  let provider = Metadata.verifyProvider(Class);
  let metadata: IModuleMetadata = Metadata.getComponentConfig(provider.provide);
  // inject shared instance
  let injector = Injector.createAndResolve(Class, isArray(exports) ? exports.map(iClass => {
      return {
        provide: iClass,
        useValue: parent.get(iClass)
      };
    }) : []);

  modules.push({
    injector,
    provider: Class,
    name: metadata.name
  });

  metadata.imports.forEach(importModule => modules = modules.concat(createModule(importModule, injector, metadata.exports)));

  let duplicates = modules
    .map(item => item.name)
    .reduce((acc, el, i, arr) => {
      if (arr.indexOf(el) !== i && acc.indexOf(el) === -1) {
        acc.push(el);
      }
      return acc;
    });

  if (duplicates.indexOf(BOOTSTRAP_MODULE) > -1) {
    throw new Error(`Only one ${BOOTSTRAP_MODULE}" module is allowed. Please make sure that all child modules have defined name
     on @Module annotation and that any @Module name is not "${BOOTSTRAP_MODULE}"`);
  } else if (duplicates.length > 0) {
    throw new Error(`Modules must have unique names. Please make sure that all child modules have unique names. ${duplicates.join(",")}`);
  }

  return modules;
}


/**
 * @since 1.0.0
 * @function
 * @name fireRequest
 * @param {Array<IModule>} modules list of all modules bootstraped
 * @param {IncomingMessage} request event emitter
 * @param {ServerResponse} response event emitter
 * @return {string|Buffer} data from controller
 *
 * @description
 * Use fireRequest to process request itself, this function is used by http/https server or
 * You can fire fake request
 */
export function fireRequest(modules: Array<IModule>,
                            request: IncomingMessage,
                            response: ServerResponse): Promise<string | Buffer> {

  let rootInjector = getModule(modules).injector;
  let logger = rootInjector.get(Logger);
  /**
   * Create RouteResolver injector
   */
  let routeResolverInjector = Injector.createAndResolveChild(
    rootInjector,
    RouteResolver,
    [
      {provide: "url", useValue: parse(request.url, true)},
      {provide: "UUID", useValue: uuid()},
      {provide: "data", useValue: []},
      {provide: "request", useValue: request},
      {provide: "response", useValue: response},
      {provide: "modules", useValue: modules}
    ]
  );
  /**
   * Get RouteResolver instance
   */
  let rRouteResolver: RouteResolver = routeResolverInjector.get(RouteResolver);

  return rRouteResolver
    .process()
    .catch(error =>
      logger.error("ControllerResolver.error", {
        stack: error.stack,
        url: request.url,
        error
      })
    );
}
