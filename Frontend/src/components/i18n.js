import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['en', 'vi'], 
    fallbackLng: 'en', 
    debug: process.env.NODE_ENV === 'development', 

    // Các tùy chọn cho LanguageDetector
    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'], // Thứ tự ưu tiên phát hiện ngôn ngữ
      caches: ['localStorage', 'cookie'], // Lưu ngôn ngữ đã chọn vào đâu để ghi nhớ
      lookupLocalStorage: 'i18nextLng', // Tên key trong localStorage
    },

    backend: {
      loadPath: '/locale/{{lng}}/translation.json', 
    },

    react: {
      useSuspense: true, // Sử dụng React Suspense để chờ tải bản dịch (quan trọng!)
    },

    interpolation: {
      escapeValue: false, // Không cần escape vì React đã tự làm
    },
  });

export default i18n;