export function WorkspaceLoading({label = 'Sto preparando il tuo workspace'}: {label?: string}) {
  return <main aria-busy="true" aria-live="polite" className="workspace-loading">
    <section className="workspace-loading__intro">
      <span className="workspace-loading__mark">W</span>
      <div><strong>{label}</strong><p>Un attimo, stiamo sincronizzando le informazioni.</p></div>
    </section>
    <section className="workspace-loading__canvas" aria-hidden="true">
      <div className="workspace-loading__line workspace-loading__line--title" />
      <div className="workspace-loading__line workspace-loading__line--copy" />
      <div className="workspace-loading__cards"><i /><i /><i /></div>
      <div className="workspace-loading__panel"><i /><i /><i /></div>
    </section>
  </main>;
}
