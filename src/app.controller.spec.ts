import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let testContainerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    // Удаляем тестовый контейнер если он был создан
    if (testContainerId) {
      await request(app.getHttpServer())
        .delete(`/containers/${testContainerId}`)
        .expect(204);
    }
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return service status', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect(res => {
          expect(res.body).toEqual({
            status: 'ok',
            timestamp: expect.any(String)
          });
        });
    });
  });

  describe('Container Management', () => {
    it('should create, manage and delete container', async () => {
      // 1. Создаем контейнер
      const createResponse = await request(app.getHttpServer())
        .post('/containers')
        .send({
          image: 'nginx:alpine',
          ports: [{ hostPort: 8080, containerPort: 80 }]
        })
        .expect(201);

      testContainerId = createResponse.body.id;
      expect(testContainerId).toBeDefined();

      // 2. Проверяем что контейнер создан
      await request(app.getHttpServer())
        .get(`/containers/${testContainerId}`)
        .expect(200);

      // 3. Останавливаем контейнер (если он запущен)
      try {
        await request(app.getHttpServer())
          .post(`/containers/${testContainerId}/stop`)
          .expect(200);
      } catch (e) {
        // Игнорируем ошибку если контейнер уже остановлен
      }

      // 4. Запускаем контейнер
      await request(app.getHttpServer())
        .post(`/containers/${testContainerId}/start`)
        .expect(200);

      // 5. Проверяем логи
      await request(app.getHttpServer())
        .get(`/containers/${testContainerId}/logs`)
        .expect(200);

      // 6. Удаляем контейнер
      await request(app.getHttpServer())
        .delete(`/containers/${testContainerId}`)
        .expect(204);

      testContainerId = 'unknown';
    });
  });
});
