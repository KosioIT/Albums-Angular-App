import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { TestBed } from '@angular/core/testing';
import { VotesComponent, timeLeft } from './votes.component';
import { voteTitle } from '../../../models/vote';

describe('VotesComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [VotesComponent],
      providers: [provideRouter([]), provideToastr()],
    }).compileComponents();
    const fixture = TestBed.createComponent(VotesComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('says how much time a vote has left', () => {
    const now = Date.parse('2026-11-20T12:00:00Z');
    expect(timeLeft('2026-11-20T12:30:00Z', now)).toBe('less than an hour left');
    expect(timeLeft('2026-11-20T13:00:00Z', now)).toBe('1 hour left');
    expect(timeLeft('2026-11-21T11:00:00Z', now)).toBe('23 hours left');
    expect(timeLeft('2026-11-23T11:59:00Z', now)).toBe('3 days left'); // just proposed
    expect(timeLeft('2026-11-21T14:00:00Z', now)).toBe('1 day left');
  });

  it('names what a vote is about', () => {
    expect(voteTitle({ action: 'ban', targetName: 'dave', days: 7 })).toBe('Ban dave for 7 days');
    expect(voteTitle({ action: 'ban', targetName: 'dave', days: 1 })).toBe('Ban dave for 1 day');
    expect(voteTitle({ action: 'ban', targetName: 'dave', days: null })).toBe('Ban dave permanently');
    expect(voteTitle({ action: 'remove_admin', targetName: 'bob', days: null })).toBe("Remove bob's admin rights");
    expect(voteTitle({ action: 'delete', targetName: 'eve', days: null })).toBe("Delete eve's account");
  });
});
