import { useTranslation } from '../context/LanguageContext.jsx';

export default function LanguageSelector() {
  const { currentLanguage, setLanguage, languages } = useTranslation();

  return (
    <div className="language-selector" style={{ display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={currentLanguage}
        onChange={(e) => setLanguage(e.target.value)}
        aria-label="Select language"
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: 600,
          borderRadius: '6px',
          border: '1px solid var(--color-border, #e2e8f0)',
          backgroundColor: 'var(--color-surface, #ffffff)',
          color: 'var(--color-text, #1e293b)',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
