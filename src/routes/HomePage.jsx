import strings from '../i18n/en.json';

export default function HomePage() {
  return (
    <main>
      <h1>{strings.home.title}</h1>
      <button disabled>{strings.home.startSession}</button>
      <button disabled>{strings.home.resumeSession}</button>
      <button disabled>{strings.home.viewHistory}</button>
    </main>
  );
}
