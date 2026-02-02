import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, mergeMap } from 'rxjs/operators';
import { AssetService } from '../../services/asset.service';
import * as AssetActions from './asset.actions';

@Injectable()
export class AssetEffects {
  private actions$ = inject(Actions);
  private assetService = inject(AssetService);

  loadAssets$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssetActions.loadAssets),
      switchMap(() =>
        this.assetService.getAssets().pipe(
          map(assets => AssetActions.loadAssetsSuccess({ assets })),
          catchError(error => of(AssetActions.loadAssetsFailure({ error })))
        )
      )
    )
  );

  deleteAsset$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssetActions.deleteAsset),
      mergeMap(({ id }) =>
        this.assetService.deleteAsset(id).pipe(
          map(() => AssetActions.deleteAssetSuccess({ id })),
          catchError(error => of(AssetActions.deleteAssetFailure({ error })))
        )
      )
    )
  );
}