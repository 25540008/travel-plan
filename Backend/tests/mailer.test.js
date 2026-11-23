import { jest } from '@jest/globals';

// Test mẫu email ET 1 (SRS 8.2) và việc gửi qua nodemailer (TP-12). Không gửi email thật.

const sendMail = jest.fn(async () => ({ messageId: 'x' }));
const createTransport = jest.fn(() => ({ sendMail }));
jest.unstable_mockModule('nodemailer', () => ({ default: { createTransport } }));

const { buildPasswordResetEmail, sendPasswordResetMail, frontendUrl } = await import('../src/utils/mailer.js');

const link = 'http://localhost:8080/dat-lai-mat-khau.html?token=abc123';

describe('ET 1: nội dung email', () => {
  test('tiêu đề đúng và có cả bản HTML lẫn bản text', () => {
    const mail = buildPasswordResetEmail({ fullName: 'Nguyễn Văn An', link });
    expect(mail.subject).toBe('[Travelplan] Đặt lại mật khẩu của bạn');
    expect(mail.html).toContain('<html');
    expect(mail.text.length).toBeGreaterThan(0);
  });

  test.each(['html', 'text'])('bản %s có lời chào, link, hiệu lực 15 phút, dùng một lần và ghi chú tự động', (kind) => {
    const body = buildPasswordResetEmail({ fullName: 'Nguyễn Văn An', link })[kind];
    expect(body).toContain('Chào Nguyễn Văn An');
    expect(body).toContain('Bạn vừa yêu cầu đặt lại mật khẩu');
    expect(body).toContain(link);
    expect(body).toContain('15 phút');
    expect(body).toContain('một lần');
    expect(body).toContain('hãy bỏ qua email này');
    expect(body).toContain('email tự động');
  });

  test('bản HTML có nút "Đặt mật khẩu mới" trỏ tới link', () => {
    const { html } = buildPasswordResetEmail({ fullName: 'An', link });
    expect(html).toMatch(/<a href="http:\/\/localhost:8080\/dat-lai-mat-khau\.html\?token=abc123"[^>]*>Đặt mật khẩu mới<\/a>/);
  });

  test('họ tên chứa ký tự HTML được mã hóa, không chèn được thẻ', () => {
    const { html } = buildPasswordResetEmail({ fullName: '<script>alert(1)</script>', link });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('gửi qua nodemailer', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
    createTransport.mockClear();
    sendMail.mockClear();
  });

  test('thiếu SMTP_HOST thì ném lỗi để nơi gọi ghi log', async () => {
    delete process.env.SMTP_HOST;
    await expect(sendPasswordResetMail({ to: 'a@b.vn', fullName: 'A', link })).rejects.toThrow(/SMTP_HOST/);
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('có SMTP_HOST thì gửi tới đúng người với tiêu đề, text và html', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'bot@example.com';
    process.env.SMTP_PASS = 'secret';
    await sendPasswordResetMail({ to: 'an@example.com', fullName: 'An', link });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com', port: 587, secure: false, auth: { user: 'bot@example.com', pass: 'secret' } }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'an@example.com', subject: '[Travelplan] Đặt lại mật khẩu của bạn', text: expect.any(String), html: expect.any(String) }),
    );
  });

  test('frontendUrl ưu tiên FRONTEND_URL và bỏ dấu / ở cuối', () => {
    process.env.FRONTEND_URL = 'https://travelplan.example.com/';
    expect(frontendUrl()).toBe('https://travelplan.example.com');
  });
});
