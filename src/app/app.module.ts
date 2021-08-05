import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { HttpClientModule, HTTP_INTERCEPTORS } from "@angular/common/http";
import { AppComponent } from "./app.component";

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule],
  providers: [
    // { provide: HTTP_INTERCEPTORS, useClass: CookieInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
