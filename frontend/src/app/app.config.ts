import { ApplicationConfig, provideBrowserGlobalErrorListeners, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { NgxEchartsModule } from 'ngx-echarts';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { assetReducer } from './core/store/asset/asset.reducer';
import { AssetEffects } from './core/store/asset/asset.effects';
import { marketReducer } from './core/store/market/market.reducer';
import { MarketEffects } from './core/store/market/market.effects';
import { RateEffects } from './core/store/exchange_rate/exchange_rate.effects';
import { rateReducer } from './core/store/exchange_rate/exchange_rate.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(NgxEchartsModule.forRoot({
        echarts: () => import('echarts')
    })),
    provideStore({
      asset: assetReducer,
      market: marketReducer,
      rate: rateReducer
    }),
    provideEffects([AssetEffects, MarketEffects, RateEffects]),
  ]
};
