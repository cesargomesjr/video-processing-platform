import { AppService } from '../../apps/api/src/app.service';

describe('AppService', () => {
  it('returns the API name', () => {
    const service = new AppService();

    expect(service.getHello()).toBe('FIAP X API');
  });
});
