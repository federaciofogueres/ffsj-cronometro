import { Injectable } from '@angular/core';
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

  constructor() { }

  setSessionSelected(session: Session | null) {
    this.sessionSelected$.next(session);
    localStorage.setItem('session', session?.id!)
  }

  setAsociacionSelected(asociacion: Asociacion | null) {
    this.asociacionselected$.next(asociacion);
    localStorage.setItem('asociacion', asociacion?.id!)
  }

  addAsociacionesSelected(asociacion: Asociacion) {
    const index = this.asociacionesArray.findIndex(arr => arr.id === asociacion.id);
    if (index === -1) {
      this.asociacionesArray.push(asociacion);
    } else {
      this.asociacionesArray.splice(index, 1);
    }
    console.log(this.asociacionesArray)
    this.asociacionesSelecteds$.next(this.asociacionesArray);
  }

  setAsociacionesSelected(asociaciones: Asociacion[]) {
    this.asociacionesArray = asociaciones;
    this.asociacionesSelecteds$.next(asociaciones);
  }

}
