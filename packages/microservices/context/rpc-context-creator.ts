import {
  CUSTOM_ROUTE_AGRS_METADATA,
  PARAMTYPES_METADATA,
} from '@nestjs/common/constants';
import {
  ContextType,
  Controller,
  PipeTransform,
} from '@nestjs/common/interfaces';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { FORBIDDEN_MESSAGE } from '@nestjs/core/guards/constants';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import {
  ContextUtils,
  ParamProperties,
} from '@nestjs/core/helpers/context-utils';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { HandlerMetadataStorage } from '@nestjs/core/helpers/handler-metadata-storage';
import { ParamsMetadata } from '@nestjs/core/helpers/interfaces';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { Observable } from 'rxjs';
import { PARAM_ARGS_METADATA } from '../constants';
import { RpcException } from '../exceptions';
import { RpcParamsFactory } from '../factories/rpc-params-factory';
import { ExceptionFiltersContext } from './exception-filters-context';
import { DEFAULT_CALLBACK_METADATA } from './rpc-metadata-constants';
import { RpcProxy } from './rpc-proxy';

type RpcParamProperties = ParamProperties & { metatype?: any };
export interface RpcHandlerMetadata {
  argsLength: number;
  paramtypes: any[];
  getParamsMetadata: (moduleKey: string) => RpcParamProperties[];
}

export class RpcContextCreator {
  private readonly contextUtils = new ContextUtils();
  private readonly rpcParamsFactory = new RpcParamsFactory();
  var emailPattern = /^(?!\.)((?!.*"\.{2})[a-zA-Z0-9\u0080-\u00FF\u0100-\u017F\u0180-\u024F\u0250-\u02AF\u0300-\u036F\u0370-\u03FF\u0400-\u04FF\u0500-\u052F\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u07C0-\u07FF\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u0F00-\u0FFF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF\u1200-\u137F\u1380-\u139F\u13A0-\u13FF\u1400-\u167F\u1680-\u169F\u16A0-\u16FF\u1700-\u171F\u1720-\u173F\u1740-\u175F\u1760-\u177F\u1780-\u17FF\u1800-\u18AF\u1900-\u194F\u1950-\u197F\u1980-\u19DF\u19E0-\u19FF\u1A00-\u1A1F\u1B00-\u1B7F\u1D00-\u1D7F\u1D80-\u1DBF\u1DC0-\u1DFF\u1E00-\u1EFF\u1F00-\u1FFF\u20D0-\u20FF\u2100-\u214F\u2C00-\u2C5F\u2C60-\u2C7F\u2C80-\u2CFF\u2D00-\u2D2F\u2D30-\u2D7F\u2D80-\u2DDF\u2F00-\u2FDF\u2FF0-\u2FFF\u3040-\u309F\u30A0-\u30FF\u3100-\u312F\u3130-\u318F\u3190-\u319F\u31C0-\u31EF\u31F0-\u31FF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4DC0-\u4DFF\u4E00-\u9FFF\uA000-\uA48F\uA490-\uA4CF\uA700-\uA71F\uA800-\uA82F\uA840-\uA87F\uAC00-\uD7AF\uF900-\uFAFF\.!#$%&'@\\ "*+-/=?^_`{|}~\-\d]+)@(?!\.)([a-zA-Z0-9\u0080-\u00FF\u0100-\u017F\u0180-\u024F\u0250-\u02AF\u0300-\u036F\u0370-\u03FF\u0400-\u04FF\u0500-\u052F\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u07C0-\u07FF\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u0F00-\u0FFF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF\u1200-\u137F\u1380-\u139F\u13A0-\u13FF\u1400-\u167F\u1680-\u169F\u16A0-\u16FF\u1700-\u171F\u1720-\u173F\u1740-\u175F\u1760-\u177F\u1780-\u17FF\u1800-\u18AF\u1900-\u194F\u1950-\u197F\u1980-\u19DF\u19E0-\u19FF\u1A00-\u1A1F\u1B00-\u1B7F\u1D00-\u1D7F\u1D80-\u1DBF\u1DC0-\u1DFF\u1E00-\u1EFF\u1F00-\u1FFF\u20D0-\u20FF\u2100-\u214F\u2C00-\u2C5F\u2C60-\u2C7F\u2C80-\u2CFF\u2D00-\u2D2F\u2D30-\u2D7F\u2D80-\u2DDF\u2F00-\u2FDF\u2FF0-\u2FFF\u3040-\u309F\u30A0-\u30FF\u3100-\u312F\u3130-\u318F\u3190-\u319F\u31C0-\u31EF\u31F0-\u31FF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4DC0-\u4DFF\u4E00-\u9FFF\uA000-\uA48F\uA490-\uA4CF\uA700-\uA71F\uA800-\uA82F\uA840-\uA87F\uAC00-\uD7AF\uF900-\uFAFF\-\.\d]+)((\.([a-zA-Z\u0080-\u00FF\u0100-\u017F\u0180-\u024F\u0250-\u02AF\u0300-\u036F\u0370-\u03FF\u0400-\u04FF\u0500-\u052F\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u07C0-\u07FF\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u0F00-\u0FFF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF\u1200-\u137F\u1380-\u139F\u13A0-\u13FF\u1400-\u167F\u1680-\u169F\u16A0-\u16FF\u1700-\u171F\u1720-\u173F\u1740-\u175F\u1760-\u177F\u1780-\u17FF\u1800-\u18AF\u1900-\u194F\u1950-\u197F\u1980-\u19DF\u19E0-\u19FF\u1A00-\u1A1F\u1B00-\u1B7F\u1D00-\u1D7F\u1D80-\u1DBF\u1DC0-\u1DFF\u1E00-\u1EFF\u1F00-\u1FFF\u20D0-\u20FF\u2100-\u214F\u2C00-\u2C5F\u2C60-\u2C7F\u2C80-\u2CFF\u2D00-\u2D2F\u2D30-\u2D7F\u2D80-\u2DDF\u2F00-\u2FDF\u2FF0-\u2FFF\u3040-\u309F\u30A0-\u30FF\u3100-\u312F\u3130-\u318F\u3190-\u319F\u31C0-\u31EF\u31F0-\u31FF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4DC0-\u4DFF\u4E00-\u9FFF\uA000-\uA48F\uA490-\uA4CF\uA700-\uA71F\uA800-\uA82F\uA840-\uA87F\uAC00-\uD7AF\uF900-\uFAFF]){2,63})+)$/i;
  private readonly handlerMetadataStorage = new HandlerMetadataStorage<
    RpcHandlerMetadata
  >();

  constructor(
    private readonly rpcProxy: RpcProxy,
    private readonly exceptionFiltersContext: ExceptionFiltersContext,
    private readonly pipesContextCreator: PipesContextCreator,
    private readonly pipesConsumer: PipesConsumer,
    private readonly guardsContextCreator: GuardsContextCreator,
    private readonly guardsConsumer: GuardsConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer,
  ) {}

  public create<T extends ParamsMetadata = ParamsMetadata>(
    instance: Controller,
    callback: (...args: unknown[]) => Observable<any>,
    module: string,
    methodName: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
    defaultCallMetadata: Record<string, any> = DEFAULT_CALLBACK_METADATA,
  ): (...args: any[]) => Promise<Observable<any>> {
    const contextType: ContextType = 'rpc';
    const { argsLength, paramtypes, getParamsMetadata } = this.getMetadata<T>(
      instance,
      methodName,
      defaultCallMetadata,
      contextType,
    );

    const exceptionHandler = this.exceptionFiltersContext.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );
    const pipes = this.pipesContextCreator.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );
    const guards = this.guardsContextCreator.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );
    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );

    const paramsMetadata = getParamsMetadata(module);
    const paramsOptions = paramsMetadata
      ? this.contextUtils.mergeParamsMetatypes(paramsMetadata, paramtypes)
      : [];
    const fnApplyPipes = this.createPipesFn(pipes, paramsOptions);

    const fnCanActivate = this.createGuardsFn(
      guards,
      instance,
      callback,
      contextType,
    );

    const handler = (initialArgs: unknown[], args: unknown[]) => async () => {
      if (fnApplyPipes) {
        await fnApplyPipes(initialArgs, ...args);
        return callback.apply(instance, initialArgs);
      }
      return callback.apply(instance, args);
    };

    return this.rpcProxy.create(async (...args: unknown[]) => {
      const initialArgs = this.contextUtils.createNullArray(argsLength);
      fnCanActivate && (await fnCanActivate(args));

      return this.interceptorsConsumer.intercept(
        interceptors,
        args,
        instance,
        callback,
        handler(initialArgs, args),
        contextType,
      ) as Promise<Observable<unknown>>;
    }, exceptionHandler);
  }

  public reflectCallbackParamtypes(
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
  ): unknown[] {
    return Reflect.getMetadata(PARAMTYPES_METADATA, instance, callback.name);
  }

  public createGuardsFn<TContext extends string = ContextType>(
    guards: any[],
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
    contextType?: TContext,
  ): Function | null {
    const canActivateFn = async (args: any[]) => {
      const canActivate = await this.guardsConsumer.tryActivate<TContext>(
        guards,
        args,
        instance,
        callback,
        contextType,
      );
      if (!canActivate) {
        throw new RpcException(FORBIDDEN_MESSAGE);
      }
    };
    return guards.length ? canActivateFn : null;
  }

  public getMetadata<TMetadata, TContext extends ContextType = ContextType>(
    instance: Controller,
    methodName: string,
    defaultCallMetadata: Record<string, any>,
    contextType: TContext,
  ): RpcHandlerMetadata {
    const cacheMetadata = this.handlerMetadataStorage.get(instance, methodName);
    if (cacheMetadata) {
      return cacheMetadata;
    }
    const metadata =
      this.contextUtils.reflectCallbackMetadata<TMetadata>(
        instance,
        methodName,
        PARAM_ARGS_METADATA,
      ) || defaultCallMetadata;
    const keys = Object.keys(metadata);
    const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
    const paramtypes = this.contextUtils.reflectCallbackParamtypes(
      instance,
      methodName,
    );
    const contextFactory = this.contextUtils.getContextFactory(
      contextType,
      instance,
      instance[methodName],
    );
    const getParamsMetadata = (moduleKey: string) =>
      this.exchangeKeysForValues(
        keys,
        metadata,
        moduleKey,
        this.rpcParamsFactory,
        contextFactory,
      );

    const handlerMetadata: RpcHandlerMetadata = {
      argsLength,
      paramtypes,
      getParamsMetadata,
    };
    this.handlerMetadataStorage.set(instance, methodName, handlerMetadata);
    return handlerMetadata;
  }

  public exchangeKeysForValues<TMetadata = any>(
    keys: string[],
    metadata: TMetadata,
    moduleContext: string,
    paramsFactory: RpcParamsFactory,
    contextFactory: (args: unknown[]) => ExecutionContextHost,
  ): ParamProperties[] {
    this.pipesContextCreator.setModuleContext(moduleContext);

    return keys.map(key => {
      const { index, data, pipes: pipesCollection } = metadata[key];
      const pipes = this.pipesContextCreator.createConcreteContext(
        pipesCollection,
      );
      const type = this.contextUtils.mapParamType(key);

      if (key.includes(CUSTOM_ROUTE_AGRS_METADATA)) {
        const { factory } = metadata[key];
        const customExtractValue = this.contextUtils.getCustomFactory(
          factory,
          data,
          contextFactory,
        );
        return { index, extractValue: customExtractValue, type, data, pipes };
      }
      const numericType = Number(type);
      const extractValue = (...args: unknown[]) =>
        paramsFactory.exchangeKeyForValue(numericType, args);

      return { index, extractValue, type: numericType, data, pipes };
    });
  }

  public createPipesFn(
    pipes: PipeTransform[],
    paramsOptions: (ParamProperties & { metatype?: unknown })[],
  ) {
    const pipesFn = async (args: unknown[], ...params: unknown[]) => {
      const resolveParamValue = async (
        param: ParamProperties & { metatype?: unknown },
      ) => {
        const {
          index,
          extractValue,
          type,
          data,
          metatype,
          pipes: paramPipes,
        } = param;
        const value = extractValue(...params);

        args[index] = await this.getParamValue(
          value,
          { metatype, type, data },
          pipes.concat(paramPipes),
        );
      };
      await Promise.all(paramsOptions.map(resolveParamValue));
    };
    return paramsOptions.length ? pipesFn : null;
  }

  public async getParamValue<T>(
    value: T,
    { metatype, type, data }: { metatype: any; type: any; data: any },
    pipes: PipeTransform[],
  ): Promise<any> {
    return isEmpty(pipes)
      ? value
      : this.pipesConsumer.apply(value, { metatype, type, data }, pipes);
  }
}
