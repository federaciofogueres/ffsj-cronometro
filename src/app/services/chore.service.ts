import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject } from 'rxjs';
import { Asociacion, Session } from '../../api';

@Injectable({
  providedIn: 'root'
})
export class ChoreService {

  private sessionSelected$ = new BehaviorSubject<Session | null>(null);
  sessionSelectedObservable = this.sessionSelected$.asObservable();

  private asociacionselected$ = new BehaviorSubject<Asociacion | null>(null);
  asociacionSelectedObservable = this.asociacionselected$.asObservable();

  public asociacionesArray: Asociacion[] = [];
  private asociacionesSelecteds$ = new BehaviorSubject<Asociacion[]>([]);
  asociacionesSelectedsObservable = this.asociacionesSelecteds$.asObservable();

  constructor(
    private cookieService: CookieService
  ) { }

  setSessionSelected(session: Session | null) {
    this.sessionSelected$.next(session);
    if(Boolean(session?.id)) {
      this.cookieService.set('session', session?.id!)
    }
  }

  setAsociacionSelected(asociacion: Asociacion | null) {
    this.asociacionselected$.next(asociacion);
    if (Boolean(asociacion?.id)){
      this.cookieService.set('asociacion', asociacion?.id!)
    }
  }

  addAsociacionesSelected(asociacion: Asociacion) {
    const index = this.asociacionesArray.findIndex(arr => arr.id === asociacion.id);
    if (index === -1) {
      const nextOrder = this.asociacionesArray.length + 1;
      this.asociacionesArray.push({ ...asociacion, order: asociacion.order ?? nextOrder });
    } else {
      this.asociacionesArray.splice(index, 1);
    }
    this.normalizeOrder();
    console.log(this.asociacionesArray)
    this.asociacionesSelecteds$.next(this.asociacionesArray);
  }

  setAsociacionesSelected(asociaciones: Asociacion[]) {
    this.asociacionesArray = [...(asociaciones || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    // normaliza orden secuencial
    this.normalizeOrder();
    this.asociacionesSelecteds$.next(this.asociacionesArray);
  }

  reorderAsociaciones(orderIds: string[]) {
    const ordered: Asociacion[] = [];
    orderIds.forEach((id, idx) => {
      const found = this.asociacionesArray.find(a => a.id === id);
      if (found) {
        ordered.push({ ...found, order: idx + 1 });
      }
    });
    this.asociacionesArray = ordered;
    this.normalizeOrder();
    this.asociacionesSelecteds$.next(this.asociacionesArray);
  }

  private normalizeOrder() {
    this.asociacionesArray = this.asociacionesArray
      .map((a, idx) => ({ ...a, order: idx + 1 }));
  }

}
