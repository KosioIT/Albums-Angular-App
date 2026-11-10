import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlbumCreateComponent, toApiDate } from './album-create.component';

describe('AlbumCreateComponent', () => {
  let fixture: ComponentFixture<AlbumCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumCreateComponent],
      providers: [provideRouter([]), provideToastr()],
    }).compileComponents();

    fixture = TestBed.createComponent(AlbumCreateComponent);
    fixture.detectChanges();
  });

  it('shows all six inputs', () => {
    const inputs: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('input'));
    expect(inputs.length).toBe(6);
    inputs.forEach((input) => expect(input.style.display).not.toBe('none'));
  });

  it('shows a validation message under a touched empty field, not on the input', () => {
    const control = fixture.componentInstance.albumForm.get('genre')!;
    control.markAsTouched();
    control.updateValueAndValidity();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#genre');
    expect(input.style.display).not.toBe('none');
    expect((input.nextElementSibling as HTMLElement).textContent).toBe('Genre is required!');
  });

  it('converts the date for the API', () => {
    expect(toApiDate('1987-07-21')).toBe('21.07.1987');
  });
});
