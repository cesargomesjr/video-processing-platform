import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  public getHello(): string {
    return 'FIAP X API';
  }
}
