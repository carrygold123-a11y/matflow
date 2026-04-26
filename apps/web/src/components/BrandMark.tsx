import logoUrl from '../assets/logo.svg';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand brand--compact' : 'brand'}>
      <img className="brand__logo" src={logoUrl} alt="BauFlow logo" />
      <div>
        <p className="brand__eyebrow">Construction operations platform</p>
        <h1 className="brand__title">BauFlow</h1>
      </div>
    </div>
  );
}
