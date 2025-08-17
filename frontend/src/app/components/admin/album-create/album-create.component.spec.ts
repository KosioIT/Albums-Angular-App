import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbumCreateComponent } from './album-create.component';

describe('AlbumCreateComponent', () => {
  let component: AlbumCreateComponent;
  let fixture: ComponentFixture<AlbumCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumCreateComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AlbumCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
