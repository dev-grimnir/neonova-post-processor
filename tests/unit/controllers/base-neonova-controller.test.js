import { BaseNeonovaController } from '@/controllers/base-neonova-controller.js';

describe('BaseNeonovaController', () => {
  let ctrl;

  beforeEach(() => {
    ctrl = new BaseNeonovaController();
  });

  describe('getSearchUrl', () => {
    it('includes username and current month start', () => {
      const url = ctrl.getSearchUrl('testuser123');
      expect(url).toContain('iuserid=testuser123');
      expect(url).toContain('sday=01');
      expect(url).toContain('smonth=');
      expect(url).toContain('syear=');
    });
  });

  describe('parsePageRows', () => {
    it('parses valid Stop + Start rows', () => {
      const html = `
        <table cellspacing="2" cellpadding="2">
          <tr><td>2025-02-03 14:30:00</td><td></td><td></td><td></td><td>Stop</td><td></td><td>00:12:45</td></tr>
          <tr><td>2025-02-03 14:17:15</td><td></td><td></td><td></td><td>Start</td><td></td><td></td></tr>
        </table>`;

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const entries = ctrl.parsePageRows(doc);

      expect(entries).toHaveLength(2);
      expect(entries[0].status).toBe('Stop');
      expect(entries[1].status).toBe('Start');
      expect(entries[0].dateObj).toBeInstanceOf(Date);
    });

    it('skips invalid date rows', () => {
      const html = `<table><tr><td>bad-date</td><td></td><td></td><td></td><td>Stop</td><td></td><td>00:00:00</td></tr></table>`;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      expect(ctrl.parsePageRows(doc)).toHaveLength(0);
    });
  });
});
