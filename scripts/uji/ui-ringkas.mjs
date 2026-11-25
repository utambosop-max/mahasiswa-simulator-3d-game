import assert from 'node:assert/strict';
import { bukaBrowser, mulaiBaru } from './bantu.mjs';

const browser = await bukaBrowser();
try {
  const p = await browser.newPage({ viewport: { width: 568, height: 256 }, hasTouch: true, isMobile: true });
  await p.addInitScript(() => {
    localStorage.setItem('mahasiswa-sim-teks-besar', 'ya');
    localStorage.setItem('mhs-kurangi-animasi', '1');
  });
  await mulaiBaru(p);
  await p.evaluate(async () => {
    const { simpanSekarang } = await import('/src/game/store.ts');
    simpanSekarang();
  });
  await p.reload();

  const game = p.locator('.kotak-game');
  const diDalam = async (locator) => {
    const batas = await game.boundingBox();
    const r = await locator.boundingBox();
    assert.ok(r && batas && r.x >= batas.x - 1 && r.y >= batas.y - 1 &&
      r.x + r.width <= batas.x + batas.width + 1 && r.y + r.height <= batas.y + batas.height + 1);
  };

  await diDalam(p.locator('.layar-judul button').first().locator('..'));
  const mainBaru = p.getByRole('button', { name: /Main Baru/ });
  await mainBaru.tap();
  await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(() => window.__game.getState().layarUtama), true);
  await p.getByRole('button', { name: 'Batal' }).tap();
  await p.getByRole('button', { name: /Main Bareng/ }).tap();
  await p.getByRole('button', { name: /Sambung/ }).scrollIntoViewIfNeeded();
  await diDalam(p.getByRole('button', { name: /Sambung/ }));
  await p.getByRole('button', { name: /Kembali/ }).tap();
  console.log('✓ Menu utama, konfirmasi Main Baru, dan formulir Online bisa digunakan pada layar pendek');

  await p.getByRole('button', { name: /Lanjutkan/ }).tap();
  await p.evaluate(() => {
    window.__game.setState({ pembuka: false, event: null, transisi: null, buatKarakter: false });
    window.__game.getState().setHP(true);
  });
  const hp = p.getByRole('dialog', { name: 'HP', exact: true });
  await hp.waitFor();
  await p.waitForTimeout(350);
  await diDalam(hp);
  assert.match(await hp.getByText(/bulan ke-/).textContent(), /bulan ke-\d+/);

  const sentuh = await p.context().newCDPSession(p);
  const geser = async (type, x, y) => sentuh.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
  });
  const aplikasi = hp.getByRole('button', { name: /^To-Do/ });
  const scroller = aplikasi.locator('../..');
  const usapKeAtas = async (locator) => {
    const r = await locator.boundingBox();
    const x = Math.round(r.x + r.width / 2);
    const y = Math.round(r.y + r.height / 2);
    await geser('touchStart', x, y);
    for (let jarak = 12; jarak <= 60; jarak += 12) await geser('touchMove', x, y - jarak);
    await geser('touchEnd', x, y - 60);
  };
  await usapKeAtas(aplikasi);
  await p.waitForFunction(() => {
    const ikon = document.querySelector('[aria-label^="To-Do"]');
    return ikon?.parentElement?.parentElement?.scrollTop > 0;
  });
  assert.equal(await p.evaluate(() => window.__game.getState().hpApp), null);
  assert.ok(await scroller.evaluate((el) => el.scrollHeight > el.clientHeight));

  await hp.getByRole('button', { name: 'Pengaturan' }).tap();
  const suara = hp.getByRole('switch', { name: /Efek suara/ });
  await suara.scrollIntoViewIfNeeded();
  const suaraAwal = await suara.getAttribute('aria-checked');
  await usapKeAtas(suara);
  assert.equal(await suara.getAttribute('aria-checked'), suaraAwal);
  await suara.tap();
  assert.notEqual(await suara.getAttribute('aria-checked'), suaraAwal);
  await hp.getByRole('button', { name: /Reset data/ }).scrollIntoViewIfNeeded();
  await diDalam(hp.getByRole('button', { name: /Reset data/ }));
  await hp.getByRole('button', { name: 'Tutup HP' }).tap();
  console.log('✓ Bingkai HP muat, sapuan pada ikon menggulir tanpa membuka aplikasi, dan opsi terakhir Pengaturan terjangkau');

  await p.evaluate(() => window.__game.setState({ buatKarakter: true }));
  const nama = p.getByPlaceholder('Nama panggilanmu');
  await nama.fill('Budi');
  await nama.press('Home');
  await nama.press('ArrowRight');
  assert.equal(await nama.evaluate((input) => input.selectionStart), 1);
  await p.evaluate(() => window.__game.setState({ buatKarakter: false }));

  const zona = p.locator('div.touch-none').filter({ has: p.locator('[data-diam]') }).last();
  const z = await zona.boundingBox();
  const jx = Math.round(z.x + 8);
  const jy = Math.round(z.y + z.height / 2);
  const input = () => p.evaluate(async () => {
    const moduleUrl = performance.getEntriesByType('resource').find((entry) => new URL(entry.name).pathname === '/src/game/input.ts')?.name;
    const { joyInput } = await import(moduleUrl ?? '/src/game/input.ts');
    return { ...joyInput };
  });
  await p.waitForFunction(({ x, y }) => document.elementFromPoint(x, y)?.classList.contains('touch-none'), { x: jx, y: jy });
  await geser('touchStart', jx, jy);
  assert.deepEqual(await input(), { x: 0, y: 0 });
  await geser('touchMove', jx + 40, jy);
  assert.ok((await input()).x > 0);
  await geser('touchEnd', jx + 40, jy);
  assert.deepEqual(await input(), { x: 0, y: 0 });
  console.log('✓ Panah menggeser kursor dan joystick baru bergerak setelah jari ditarik');
} finally {
  await browser.close();
}
