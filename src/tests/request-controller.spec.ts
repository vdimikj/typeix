import {Methods} from "../router/router";
import {Injector} from "../injector/injector";
import {ResolvedRoute} from "../interfaces/iroute";
import {Request, ControllerResolver} from "../server/request";
import {assert, expect, use} from "chai";
import * as sinonChai from "sinon-chai";
import {spy, stub, assert as assertSpy} from "sinon";
import {EventEmitter} from "events";
import {isEqual, uuid} from "../core";
import {Logger} from "../logger/logger";

// use chai spies
use(sinonChai);

describe("ControllerResolver", () => {


  let resolvedRoute: ResolvedRoute;
  let eventEmitter;
  let controllerResolver: ControllerResolver;
  let controllerProvider, IRequest, request, response, data, id = uuid(), url = "/";

  beforeEach(() => {
    resolvedRoute = {
      method: Methods.GET,
      params: {
        a: 1,
        b: 2
      },
      route: "core/index"
    };
    response = {};
    request = {};
    data = {};
    controllerProvider = {};
    IRequest = {};
    eventEmitter  = new EventEmitter();
    let injector = Injector.createAndResolve(ControllerResolver, [
      {provide: "data", useValue: data},
      {provide: "request", useValue: request},
      {provide: "response", useValue: response},
      {provide: "url", useValue: url},
      {provide: "UUID", useValue: id},
      {provide: "controllerProvider", useValue: controllerProvider},
      {provide: "actionName", useValue: "action"},
      {provide: "resolvedRoute", useValue: resolvedRoute},

      {provide: "isRedirected", useValue: false},
      {provide: "isCustomError", useValue: false},
      {provide: "isForwarded", useValue: false},
      {provide: "isForwarder", useValue: false},
      {provide: "isChainStopped", useValue: false},
      {provide: EventEmitter, useValue: eventEmitter},
      {provide: Request, useValue: IRequest},
      Logger
    ]);
    controllerResolver = injector.get(ControllerResolver);
  });

  it("ControllerResolver.constructor", () => {
    assert.isTrue(controllerResolver instanceof ControllerResolver);
  });

  it("ControllerResolver.setStatusCode", () => {
    let aSpy = spy(eventEmitter, "emit");
    controllerResolver.setStatusCode(400);
    assertSpy.calledWith(aSpy, "statusCode", 400);
  });

  it("ControllerResolver.setContentType", () => {
    let contentType = "application/json";
    let aSpy = spy(eventEmitter, "emit");
    controllerResolver.setContentType(contentType);
    assertSpy.calledWith(aSpy, "contentType", contentType);
  });

  it("ControllerResolver.stopActionChain", () => {
    assert.isFalse(Reflect.get(controllerResolver, "isChainStopped"));
    controllerResolver.stopActionChain();
    assert.isTrue(Reflect.get(controllerResolver, "isChainStopped"));
  });

  it("ControllerResolver.destroy", () => {
    let aSpy = spy(eventEmitter, "emit");
    let bSpy = spy(eventEmitter, "removeAllListeners");
    controllerResolver.destroy();
    assertSpy.calledWith(aSpy, "destroy");
    assertSpy.called(bSpy);
  });

  it("ControllerResolver.getEventEmitter", () => {
    assert.isTrue(isEqual(controllerResolver.getEventEmitter(), eventEmitter));
  });

  it("ControllerResolver.getIncomingMessage", () => {
    assert.isTrue(isEqual(controllerResolver.getIncomingMessage(), request));
  });
});