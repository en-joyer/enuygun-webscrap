import { test, expect } from '@playwright/test';
import fs from 'fs';
import { join } from 'path';
import XLSX from 'xlsx';

test.use({
  viewport: { width: 1600, height: 1200 },
});

// Tarih
const gecerliTarih = new Date().toLocaleString('tr-TR', { hour12: false })
  .replace(/[./,]/g, '')
  .replace(/\s+/g, '-')
  .replace(/:/g, '');

// Çıktı dosyaları
const jsonDosyasi = `output_${gecerliTarih}.json`;
const excelDosyasi = `cikti_${gecerliTarih}.xlsx`;
// Diziler
const tumBilgiler = [];
const excelVerisi = [];
const istenenTarih = ("28 Haziran 2023")

test('Siteye gir, bilgileri girerek en ucuz biletleri göster.', async ({ page }) => {
  await page.goto('https://www.enuygun.com/');
  await page.getByLabel('Nereden').click();
  await page.getByLabel('Nereden').fill('kayseri');
  await page.getByText('Kayseri, TürkiyeErkilet Havalimanı ASR').click();
  await page.getByLabel('Nereye').click();
  await page.getByLabel('Nereye').click();
  await page.getByLabel('Nereye').fill('pekin');
  await page.getByText('Pekin, ÇinTüm havalimanları BJSA').click();
  await page.getByPlaceholder('Date').click();
  await page.getByRole('button', { name: istenenTarih }).click();
  await page.getByTestId('formSubmitButton').click();
  await page.getByText('En ucuz').click();

  const liste = await page.$$('.flight-list-body'); // Tüm flight-item__wrapper elementlerini seçer
  for (const listeOgeleri of liste) {
    const ucusBilgileri = await page.$$('.flight-item__wrapper');
    for (const ucusBilgisi of ucusBilgileri) {
      const havayolu = await ucusBilgisi.$$eval('.summary-airline .summary-marketing-airlines ', elements => elements.map(el => el.textContent.trim()).join(' + '));
      const havalimanlari = await ucusBilgisi.$$eval('.summary-airports .itemAirport', elements => elements.map(el => el.textContent.trim() || '>').join(' '));
      const bagaj = await ucusBilgisi.$$eval('.summary-luggage .summary-luggage-value', elements => elements.map(el => el.textContent));
      const aktarma = await ucusBilgisi.$$eval('.summary-transit', elements => elements.map(el => el.textContent));
      const kalkis = await ucusBilgisi.$$eval('.flight-departure-time', elements => elements.map(el => el.textContent));
      const varis = await ucusBilgisi.$$eval('.flight-arrival-time', elements => elements.map(el => el.textContent));
      const toplamSaat = await ucusBilgisi.$eval('.summary-duration', element => element.textContent);
      const ucret = await ucusBilgisi.$$eval('.money-int', elements => elements.map(el => el.textContent));

      tumBilgiler.push({
        'Havayolu': havayolu,
        'Havalimanları': havalimanlari,
        'Bagaj': bagaj + ("kg"),
        'Aktarma': aktarma,
        'Kalkış': kalkis,
        'Varış': varis,
        'Toplam Saat': toplamSaat,
        'Ücret': ucret + ("₺"),
      });
    }
  }
  // Dosya Kaydetme İşlemi

  // JSON

  fs.writeFileSync(jsonDosyasi, JSON.stringify(tumBilgiler, null, 2));

  // XLSX
  const calismaKitabi = XLSX.utils.book_new(); // Excel çalışma kitabı oluşturuluyor
  const calismaSayfasi = XLSX.utils.aoa_to_sheet([
    ['Havayolu', 'Havalimanları', 'Bagaj', 'Aktarma', 'Kalkış', 'Varış', 'Toplam Saat', 'Ücret']
  ]); // Başlık satırı oluşturuluyor
  
  tumBilgiler.forEach(bilgi => {
    const { Havayolu, Havalimanları, Bagaj, Aktarma, Kalkış, Varış, 'Toplam Saat': ToplamSaat, Ücret } = bilgi;
    const row = [Havayolu, Havalimanları, Bagaj, Aktarma, Kalkış, Varış, ToplamSaat, Ücret];
    XLSX.utils.sheet_add_aoa(calismaSayfasi, [row], { origin: -1 }); // Öğeler satır olarak ekleniyor
  });
  
  const wsName = "Bilet Bilgileri";
  XLSX.utils.book_append_sheet(calismaKitabi, calismaSayfasi, wsName); // Çalışma sayfası çalışma kitabına ekleniyor
  
  XLSX.writeFile(calismaKitabi, excelDosyasi); // Excel dosyası oluşturuluyor
  

});
