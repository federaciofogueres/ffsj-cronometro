import { NgModule, ModuleWithProviders, SkipSelf, Optional } from '@angular/core';
import { Configuration } from './configuration';
import { HttpClient } from '@angular/common/http';


import { AsociacionesService } from './api/asociaciones.service';
import { SesionesService } from './api/sesiones.service';
import { SettingsService } from './api/settings.service';
import { TypeSesionService } from './api/typeSesion.service';

@NgModule({
  imports:      [],
  declarations: [],
  exports:      [],
  providers: [
    AsociacionesService,
    SesionesService,
    SettingsService,
    TypeSesionService ]
})
export class ApiModule {
    public static forRoot(configurationFactory: () => Configuration): ModuleWithProviders<ApiModule> {
        return {
            ngModule: ApiModule,
            providers: [ { provide: Configuration, useFactory: configurationFactory } ]
        };
    }

    constructor( @Optional() @SkipSelf() parentModule: ApiModule,
                 @Optional() http: HttpClient) {
        if (parentModule) {
            throw new Error('ApiModule is already loaded. Import in your base AppModule only.');
        }
        if (!http) {
            throw new Error('You need to import the HttpClientModule in your AppModule! \n' +
            'See also https://github.com/angular/angular/issues/20575');
        }
    }
}
