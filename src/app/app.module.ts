import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { HttpClientModule } from "@angular/common/http";
import {OdUser} from './odoo/service/OdUser';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
	  HttpClientModule
  ],
  providers: [OdUser],
  bootstrap: [AppComponent]
})
export class AppModule { }
