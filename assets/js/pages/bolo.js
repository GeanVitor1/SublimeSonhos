/* =========================================================================
   SUBLIME SONHOS — BOLO PERSONALIZADO (wizard)
   5 passos: Tamanho → Sabor → Tema → Data/Contato/Entrega → Pagamento
   Valor sob consulta — envia pelo WhatsApp.
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var cfg = SS.config;
  var passo = 1;
  var TOTAIS = 5;
  var dados = {
    tamanho: '', peso: '', pessoas: '',
    massa: '', recheio: '', cobertura: '',
    tema: '', cores: '', decoracao: '', topo: '', mensagem: '', referencia: '',
    data: '', hora: '',
    nome: '', telefone: '',
    modalidade: 'retirada',
    endereco: { rua: '', numero: '', complemento: '', bairro: '', cidade: cfg.loja.cidade, referencia: '' },
    momentoPagamento: 'na-entrega', pagamento: '',
    card: { numero: '', nome: '', validade: '', cvv: '', parcelas: '1' },
    troco: false, trocoPara: '', pagamentoAprovado: false,
    observacoes: ''
  };

  function dataMinimaISO() {
    var hoje = new Date(); hoje.setHours(0,0,0,0);
    return u.dataParaInput(u.addDias(hoje, 3));
  }

  function render() {
    var el = document.getElementById('bolo-conteudo');
    if (!el) return;
    var passos = [];
    for (var i = 1; i <= TOTAIS; i++) {
      passos.push('<div class="steps-bar__item' + (i < passo ? ' done' : i === passo ? ' active' : '') + '"></div>');
    }
    el.innerHTML =
      '<div class="steps-bar" aria-hidden="true">' + passos.join('') + '</div>' +
      '<div class="checkout-grid">' +
        '<div id="painel-esquerda"></div>' +
        '<aside class="panel" id="painel-resumo" style="position:sticky;top:calc(var(--header-h) + 20px)"></aside>' +
      '</div>';
    renderResumo();
    renderPasso();
  }

  function resumoLinha(label, val) {
    if (!val) return '';
    return '<div class="row"><span>' + u.esc(label) + '</span><span style="text-align:right;max-width:60%">' + u.esc(val) + '</span></div>';
  }

  function renderResumo() {
    var el = document.getElementById('painel-resumo');
    if (!el) return;
    var temConteudo = dados.tamanho || dados.massa || dados.recheio || dados.tema || dados.data;
    el.innerHTML =
      '<h2>Resumo do bolo</h2>' +
      '<div class="panel__body">' +
        (!temConteudo ? '<p class="text-sm text-muted">Preencha os passos ao lado — o resumo aparece aqui em tempo real.</p>' :
        '<div class="summary-totals" style="border-top:none;margin-top:0;padding-top:0">' +
          resumoLinha('Tamanho', dados.tamanho + (dados.peso ? ' · ' + dados.peso : '') + (dados.pessoas ? ' · ' + dados.pessoas + ' pessoas' : '')) +
          resumoLinha('Massa', dados.massa) +
          resumoLinha('Recheio', dados.recheio) +
          resumoLinha('Cobertura', dados.cobertura) +
          resumoLinha('Tema', dados.tema) +
          resumoLinha('Cores', dados.cores) +
          resumoLinha('Decoração', dados.decoracao) +
          resumoLinha('Topo', dados.topo) +
          resumoLinha('Mensagem', dados.mensagem) +
          resumoLinha('Data', dados.data ? u.fmtDataLongo(dados.data) + (dados.hora ? ' às ' + dados.hora : '') : '') +
          resumoLinha('Contato', dados.nome ? dados.nome + (dados.telefone ? ' · ' + dados.telefone : '') : '') +
          resumoLinha('Entrega', dados.modalidade === 'entrega' ? 'Entrega' + (dados.endereco.bairro ? ' · ' + dados.endereco.bairro : '') : 'Retirada') +
        '</div>') +
        '<p class="text-sm text-muted mt-2" style="display:flex;gap:8px;align-items:flex-start"><iconify-icon icon="ph:info" width="16" height="16" style="margin-top:2px"></iconify-icon> Valor sob consulta — o orçamento será enviado pela loja após o envio.</p>' +
        '<div class="mt-3" style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge badge--rose">Sob consulta</span><span class="badge badge--green">3 dias antecedência</span></div>' +
      '</div>';
  }

  function renderPasso() {
    var el = document.getElementById('painel-esquerda');
    if (!el) return;
    var html = '';
    var nav = '';

    if (passo === 1) {
      html =
        '<div class="panel"><h2><span class="n">1</span> Tamanho e porções</h2><div class="panel__body">' +
          '<p class="form-hint mb-3">Começamos pelo básico — tamanho e para quantas pessoas é o bolo.</p>' +
          '<div class="form-grid">' +
            '<div class="form-group" id="g-tamanho"><label class="form-label" for="f-tamanho">Tamanho <span class="req">*</span></label><select class="form-control" id="f-tamanho"><option value="">Selecione…</option><option value="15 cm"' + (dados.tamanho==='15 cm'?' selected':'') + '>15 cm</option><option value="20 cm"' + (dados.tamanho==='20 cm'?' selected':'') + '>20 cm</option><option value="25 cm"' + (dados.tamanho==='25 cm'?' selected':'') + '>25 cm</option><option value="30 cm"' + (dados.tamanho==='30 cm'?' selected':'') + '>30 cm</option><option value="Outro tamanho (informar)"' + (dados.tamanho==='Outro tamanho (informar)'?' selected':'') + '>Outro tamanho</option></select><div class="form-error">Informe o tamanho.</div></div>' +
            '<div class="form-group"><label class="form-label" for="f-peso">Peso estimado</label><input class="form-control" id="f-peso" type="text" placeholder="Ex.: 2 kg" value="' + u.esc(dados.peso) + '"></div>' +
            '<div class="form-group"><label class="form-label" for="f-pessoas">Quantidade de pessoas</label><input class="form-control" id="f-pessoas" type="text" inputmode="numeric" placeholder="Ex.: 25" value="' + u.esc(dados.pessoas) + '"></div>' +
          '</div>' +
        '</div></div>';
    } else if (passo === 2) {
      html =
        '<div class="panel"><h2><span class="n">2</span> Sabor do bolo</h2><div class="panel__body">' +
          '<p class="form-hint mb-3">Escolha a combinação que vai rechear seu bolo.</p>' +
          '<div class="form-grid">' +
            '<div class="form-group" id="g-massa"><label class="form-label" for="f-massa">Massa <span class="req">*</span></label><select class="form-control" id="f-massa"><option value="">Selecione…</option><option value="Chocolate"' + (dados.massa==='Chocolate'?' selected':'') + '>Chocolate</option><option value="Baunilha"' + (dados.massa==='Baunilha'?' selected':'') + '>Baunilha</option><option value="Red velvet"' + (dados.massa==='Red velvet'?' selected':'') + '>Red velvet</option><option value="Cenoura"' + (dados.massa==='Cenoura'?' selected':'') + '>Cenoura</option><option value="Casadinho"' + (dados.massa==='Casadinho'?' selected':'') + '>Casadinho</option><option value="Outra (informar)"' + (dados.massa==='Outra (informar)'?' selected':'') + '>Outra</option></select><div class="form-error">Informe a massa.</div></div>' +
            '<div class="form-group" id="g-recheio"><label class="form-label" for="f-recheio">Recheio <span class="req">*</span></label><select class="form-control" id="f-recheio"><option value="">Selecione…</option><option value="Brigadeiro"' + (dados.recheio==='Brigadeiro'?' selected':'') + '>Brigadeiro</option><option value="Ninho"' + (dados.recheio==='Ninho'?' selected':'') + '>Ninho</option><option value="Ninho com Nutella"' + (dados.recheio==='Ninho com Nutella'?' selected':'') + '>Ninho com Nutella</option><option value="Doce de leite"' + (dados.recheio==='Doce de leite'?' selected':'') + '>Doce de leite</option><option value="Frutas vermelhas"' + (dados.recheio==='Frutas vermelhas'?' selected':'') + '>Frutas vermelhas</option><option value="Outro (informar)"' + (dados.recheio==='Outro (informar)'?' selected':'') + '>Outro</option></select><div class="form-error">Informe o recheio.</div></div>' +
            '<div class="form-group" id="g-cobertura"><label class="form-label" for="f-cobertura">Cobertura <span class="req">*</span></label><select class="form-control" id="f-cobertura"><option value="">Selecione…</option><option value="Chantilly"' + (dados.cobertura==='Chantilly'?' selected':'') + '>Chantilly</option><option value="Ganache de chocolate"' + (dados.cobertura==='Ganache de chocolate'?' selected':'') + '>Ganache de chocolate</option><option value="Pasta americana"' + (dados.cobertura==='Pasta americana'?' selected':'') + '>Pasta americana</option><option value="Naked (sem cobertura externa)"' + (dados.cobertura==='Naked (sem cobertura externa)'?' selected':'') + '>Naked</option><option value="Outra (informar)"' + (dados.cobertura==='Outra (informar)'?' selected':'') + '>Outra</option></select><div class="form-error">Informe a cobertura.</div></div>' +
          '</div>' +
        '</div></div>';
    } else if (passo === 3) {
      html =
        '<div class="panel"><h2><span class="n">3</span> Tema e decoração</h2><div class="panel__body">' +
          '<p class="form-hint mb-3">Conte como você imagina o visual — cores, decoração e mensagem.</p>' +
          '<div class="form-grid">' +
            '<div class="form-group" style="grid-column:1/-1"><label class="form-label" for="f-tema">Tema</label><input class="form-control" id="f-tema" type="text" placeholder="Ex.: tema de princesa, futebol, floral…" value="' + u.esc(dados.tema) + '"></div>' +
            '<div class="form-group"><label class="form-label" for="f-cores">Cores</label><input class="form-control" id="f-cores" type="text" placeholder="Ex.: rosa e dourado" value="' + u.esc(dados.cores) + '"></div>' +
            '<div class="form-group"><label class="form-label" for="f-decoracao">Decoração</label><input class="form-control" id="f-decoracao" type="text" placeholder="Ex.: flores de açúcar, laços…" value="' + u.esc(dados.decoracao) + '"></div>' +
            '<div class="form-group"><label class="form-label" for="f-topo">Topo de bolo</label><input class="form-control" id="f-topo" type="text" placeholder="Ex.: topper com nome" value="' + u.esc(dados.topo) + '"></div>' +
            '<div class="form-group" style="grid-column:1/-1"><label class="form-label" for="f-mensagem">Mensagem no bolo</label><input class="form-control" id="f-mensagem" type="text" placeholder="Ex.: Parabéns, Maria!" value="' + u.esc(dados.mensagem) + '"></div>' +
            '<div class="form-group" style="grid-column:1/-1"><label class="form-label" for="f-ref">Foto de referência (opcional)</label><input class="form-control" id="f-ref" type="text" placeholder="Descreva a referência ou envie a foto depois, direto no WhatsApp" value="' + u.esc(dados.referencia) + '"><p class="form-hint"><iconify-icon icon="ph:camera" width="15" height="15" style="vertical-align:-2px"></iconify-icon> A foto deve ser enviada <strong>diretamente no WhatsApp</strong> após abrir o chat.</p></div>' +
          '</div>' +
        '</div></div>';
    } else if (passo === 4) {
      var min = dataMinimaISO();
      var horarios = [];
      for (var h = 8; h <= 19; h++) horarios.push('<option value="' + String(h).padStart(2,'0') + ':00"' + (dados.hora === String(h).padStart(2,'0') + ':00' ? ' selected' : '') + '>' + String(h).padStart(2,'0') + ':00</option>');
      var dataFmtBolo = dados.data ? u.fmtData(dados.data) : '';
      html =
        '<div class="panel"><h2><span class="n">4</span> Data, contato e entrega</h2><div class="panel__body">' +
          '<div class="form-grid">' +
            '<div class="form-group" id="g-data"><label class="form-label" for="f-data">Data desejada <span class="req">*</span></label><input class="form-control dp-input" id="f-data" type="text" readonly placeholder="Selecione a data" value="' + u.esc(dataFmtBolo) + '" data-iso="' + u.esc(dados.data) + '"><div class="form-error">Escolha uma data (mínimo 3 dias).</div><p class="form-hint">Sujeito à confirmação da loja.</p></div>' +
            '<div class="form-group" id="g-hora"><label class="form-label" for="f-hora">Horário <span class="req">*</span></label><select class="form-control" id="f-hora"><option value="">Selecione…</option>' + horarios.join('') + '</select><div class="form-error">Escolha o horário.</div></div>' +
            '<div class="form-group" id="g-nome"><label class="form-label" for="f-nome">Nome completo <span class="req">*</span></label><input class="form-control" id="f-nome" type="text" autocomplete="name" value="' + u.esc(dados.nome) + '"><div class="form-error">Informe seu nome.</div></div>' +
            '<div class="form-group" id="g-telefone"><label class="form-label" for="f-telefone">WhatsApp <span class="req">*</span></label><input class="form-control" id="f-telefone" type="tel" inputmode="tel" placeholder="(73) 90000-0000" value="' + u.esc(dados.telefone) + '"><div class="form-error">Informe um telefone válido.</div></div>' +
          '</div>' +
          '<div class="mt-3"><label class="form-label">Retirada ou entrega</label><div class="opts mt-2"><label class="opt' + (dados.modalidade==='retirada'?' selected':'') + '"><input type="radio" name="modalidade" value="retirada"' + (dados.modalidade==='retirada'?' checked':'') + '><span class="opt__dot"></span><span class="opt__label">Retirada no local</span></label><label class="opt' + (dados.modalidade==='entrega'?' selected':'') + '"><input type="radio" name="modalidade" value="entrega"' + (dados.modalidade==='entrega'?' checked':'') + '><span class="opt__dot"></span><span class="opt__label">Entrega em domicílio</span></label></div></div>' +
          '<div id="endereco-fields"' + (dados.modalidade==='entrega' ? '' : ' class="hidden"') + ' style="margin-top:16px"><div class="form-grid"><div class="form-group"><label class="form-label" for="f-numero">Número</label><input class="form-control" id="f-numero" type="text" inputmode="numeric" value="' + u.esc(dados.endereco.numero) + '"></div><div class="form-group"><label class="form-label" for="f-rua">Rua</label><input class="form-control" id="f-rua" type="text" value="' + u.esc(dados.endereco.rua) + '"></div><div class="form-group"><label class="form-label" for="f-complemento">Complemento</label><input class="form-control" id="f-complemento" type="text" value="' + u.esc(dados.endereco.complemento) + '"></div><div class="form-group"><label class="form-label" for="f-bairro">Bairro</label><input class="form-control" id="f-bairro" type="text" value="' + u.esc(dados.endereco.bairro) + '"></div><div class="form-group"><label class="form-label" for="f-cidade">Cidade</label><input class="form-control" id="f-cidade" type="text" value="' + u.esc(dados.endereco.cidade) + '"></div><div class="form-group" style="grid-column:1/-1"><label class="form-label" for="f-refend">Ponto de referência</label><input class="form-control" id="f-refend" type="text" value="' + u.esc(dados.endereco.referencia) + '"></div></div><p class="form-hint mt-2">' + u.esc(cfg.loja.entrega.nota) + '</p></div>' +
        '</div></div>';
    } else if (passo === 5) {
      html =
        '<div class="panel"><h2><span class="n">5</span> Pagamento e envio</h2><div class="panel__body">' +
          '<p class="form-hint mb-2">Escolha como prefere pagar e revise antes de enviar.</p>' +
          '<div class="opts"><label class="opt' + (dados.momentoPagamento==='antecipado'?' selected':'') + '"><input type="radio" name="momento" value="antecipado"' + (dados.momentoPagamento==='antecipado'?' checked':'') + '><span class="opt__dot"></span><span class="opt__label">Pagamento antecipado</span></label><label class="opt' + (dados.momentoPagamento==='na-entrega'?' selected':'') + '"><input type="radio" name="momento" value="na-entrega"' + (dados.momentoPagamento==='na-entrega'?' checked':'') + '><span class="opt__dot"></span><span class="opt__label">Pagamento na entrega/retirada</span></label></div>' +
          '<div class="form-group mt-3" id="g-forma"><label class="form-label">Forma de pagamento <span class="req">*</span></label>' + SS.pagamento.renderControles(dados) + '<div class="form-error">Escolha a forma.</div></div>' +
          '<div class="form-group mt-3"><label class="form-label" for="f-obs">Observações gerais</label><textarea class="form-control" id="f-obs" rows="3" placeholder="Algum detalhe importante sobre o bolo ou evento?">' + u.esc(dados.observacoes) + '</textarea></div>' +
          '<button type="button" class="btn btn--whatsapp btn--lg btn--block mt-3" id="btn-simular-pagamento">Simular pagamento</button>' +
          '<div class="notice mt-3"><iconify-icon icon="ph:shield-check" width="20" height="20"></iconify-icon><span><strong>Valor sob consulta:</strong> ao simular, a mensagem formatada abre no WhatsApp e a loja responde com o orçamento.</span></div>' +
        '</div></div>';
    }

    var nav =
      '<div class="flex gap-3 mt-4" style="flex-wrap:wrap">' +
        (passo > 1 ? '<button type="button" class="btn btn--outline" id="btn-voltar">← Voltar</button>' : '<a class="btn btn--outline" href="index.html">← Início</a>') +
        (passo < TOTAIS ? '<button type="button" class="btn btn--primary btn--lg" id="btn-avancar">Continuar →</button>' : '') +
      '</div>';
    el.innerHTML = html + nav;

    if (passo === 1) initPasso1();
    if (passo === 2) initPasso2();
    if (passo === 3) initPasso3();
    if (passo === 4) initPasso4();
    if (passo === 5) initPasso5();

    SS.ui.initCustomSelects(el);

    var av = document.getElementById('btn-avancar');
    if (av) av.addEventListener('click', function () { if (validarPasso()) { passo++; render(); window.scrollTo({top:0,behavior:'smooth'}); } });
    var vo = document.getElementById('btn-voltar');
    if (vo) vo.addEventListener('click', function () { passo--; render(); window.scrollTo({top:0,behavior:'smooth'}); });
  }

  function initPasso1() {
    var m = { 'f-tamanho':'tamanho', 'f-peso':'peso', 'f-pessoas':'pessoas' };
    Object.keys(m).forEach(function(id){
      var el=document.getElementById(id); if(!el) return;
      var k=m[id];
      var ev = el.tagName==='SELECT' ? 'change' : 'input';
      el.addEventListener(ev, function(){ dados[k]=el.value.trim(); if(k==='pessoas'){ dados[k]=u.apenasDigitos(dados[k]); el.value=dados[k]; } document.getElementById('g-tamanho')&&document.getElementById('g-tamanho').classList.remove('invalid'); renderResumo(); });
    });
  }
  function initPasso2() {
    ['f-massa','f-recheio','f-cobertura'].forEach(function(id){
      var el=document.getElementById(id); if(!el) return;
      el.addEventListener('change', function(){ dados[id.slice(2)]=el.value; document.getElementById('g-'+id.slice(2)).classList.remove('invalid'); renderResumo(); });
    });
  }
  function initPasso3() {
    var m={ 'f-tema':'tema','f-cores':'cores','f-decoracao':'decoracao','f-topo':'topo','f-mensagem':'mensagem','f-ref':'referencia' };
    Object.keys(m).forEach(function(id){ var el=document.getElementById(id); if(!el) return; el.addEventListener('input', function(){ dados[m[id]]=el.value.trim(); renderResumo(); }); });
  }
  function initPasso4() {
    var d=document.getElementById('f-data');
    if(d && SS.ui && SS.ui.initDatePicker){
      SS.ui.initDatePicker(d, dataMinimaISO(), function(iso){ dados.data=iso; document.getElementById('g-data').classList.remove('invalid'); renderResumo(); }, dados.data);
      d.addEventListener('change', function(){ var iso=d.dataset.iso||d.value; dados.data=iso||''; document.getElementById('g-data').classList.remove('invalid'); renderResumo(); });
    } else if(d){ d.addEventListener('change', function(){ dados.data=d.dataset.iso||d.value; document.getElementById('g-data').classList.remove('invalid'); renderResumo(); }); d.addEventListener('input', function(){ dados.data=d.dataset.iso||d.value; if(d.value) document.getElementById('g-data').classList.remove('invalid'); renderResumo(); }); }
    var h=document.getElementById('f-hora');
    if(h) h.addEventListener('change', function(){ dados.hora=h.value; document.getElementById('g-hora').classList.remove('invalid'); renderResumo(); });
    var nome=document.getElementById('f-nome'); if(nome) nome.addEventListener('input', function(){ dados.nome=nome.value.trim(); document.getElementById('g-nome').classList.remove('invalid'); renderResumo(); });
    var tel=document.getElementById('f-telefone'); if(tel) tel.addEventListener('input', function(){ tel.value=u.mascaraTelefone(tel.value); dados.telefone=tel.value.trim(); document.getElementById('g-telefone').classList.remove('invalid'); renderResumo(); });
    document.querySelectorAll('input[name="modalidade"]').forEach(function(r){ r.addEventListener('change', function(){ dados.modalidade=r.value; document.querySelectorAll('input[name="modalidade"]').forEach(function(x){ x.closest('.opt').classList.toggle('selected', x.checked); }); document.getElementById('endereco-fields').classList.toggle('hidden', r.value!=='entrega'); renderResumo(); }); });
    var mapa={ 'f-numero':'numero','f-rua':'rua','f-complemento':'complemento','f-bairro':'bairro','f-cidade':'cidade','f-refend':'referencia' };
    Object.keys(mapa).forEach(function(id){ var el=document.getElementById(id); if(!el) return; el.addEventListener('input', function(){ dados.endereco[mapa[id]]=el.value.trim(); }); });
    var pessoas=document.getElementById('f-pessoas'); // not here
  }
  function initPasso5() {
    SS.pagamento.init(document.getElementById('painel-esquerda'), dados, function(){
      enviar(); // após simular aprovado
    }, { onValidarExtra: function(){ return validarPasso(); } });
    var obs=document.getElementById('f-obs'); if(obs) obs.addEventListener('input', function(){ dados.observacoes=obs.value.trim(); });
  }

  function validarPasso(){
    if (passo===1){
      var ok=true; if(!dados.tamanho){ document.getElementById('g-tamanho').classList.add('invalid'); ok=false; }
      if(!ok) SS.ui.toast('Informe o tamanho do bolo.', 'error');
      return ok;
    }
    if (passo===2){
      var ok2=true;
      if(!dados.massa){ document.getElementById('g-massa').classList.add('invalid'); ok2=false; }
      if(!dados.recheio){ document.getElementById('g-recheio').classList.add('invalid'); ok2=false; }
      if(!dados.cobertura){ document.getElementById('g-cobertura').classList.add('invalid'); ok2=false; }
      if(!ok2) SS.ui.toast('Escolha massa, recheio e cobertura.', 'error');
      return ok2;
    }
    if (passo===3) return true;
    if (passo===4){
      var ok4=true;
      if(!dados.data){ document.getElementById('g-data').classList.add('invalid'); ok4=false; }
      else { var dt=u.dataDeInput(dados.data); var minMid=u.dataDeInput(dataMinimaISO()); if(dt && minMid && dt < minMid){ document.getElementById('g-data').classList.add('invalid'); SS.ui.toast('Escolha data com mínimo 3 dias de antecedência.', 'error'); ok4=false; } }
      if(!dados.hora){ document.getElementById('g-hora').classList.add('invalid'); ok4=false; }
      if(!dados.nome){ document.getElementById('g-nome').classList.add('invalid'); ok4=false; }
      if(!dados.telefone || u.apenasDigitos(dados.telefone).length < 10){ document.getElementById('g-telefone').classList.add('invalid'); ok4=false; }
      if(!ok4) SS.ui.toast('Preencha data, horário, nome e WhatsApp.', 'error');
      if(ok4 && dados.modalidade==='entrega'){
        // entrega não é obrigatória rigorosa, apenas hint, mas valida se quiser
      }
      return ok4;
    }
    if (passo===5){
      if(!dados.momentoPagamento){ SS.ui.toast('Escolha o momento do pagamento.', 'error'); return false; }
      var v=SS.pagamento.validar(dados);
      if(!v.ok){ var gf=document.getElementById('g-forma'); if(gf) gf.classList.add('invalid'); SS.ui.toast(v.erros.join(' '), 'error'); return false; }
      var gf2=document.getElementById('g-forma'); if(gf2) gf2.classList.remove('invalid');
      return true;
    }
    return true;
  }

  function enviar(){
    // garante validação final
    if(!dados.tamanho || !dados.massa || !dados.recheio || !dados.cobertura || !dados.data || !dados.hora || !dados.nome || !dados.telefone ){
      SS.ui.toast('Preencha os campos obrigatórios.', 'error'); passo=1; render(); return;
    }
    var pedido={
      numero: u.gerarNumeroPedido(),
      tipo: 'Orçamento de bolo personalizado',
      cliente: dados.nome,
      telefone: dados.telefone,
      tamanho: dados.tamanho,
      peso: dados.peso,
      pessoas: dados.pessoas,
      massa: dados.massa,
      recheio: dados.recheio,
      cobertura: dados.cobertura,
      tema: dados.tema,
      cores: dados.cores,
      decoracao: dados.decoracao,
      topo: dados.topo,
      mensagem: dados.mensagem,
      referencia: dados.referencia,
      data: dados.data,
      hora: dados.hora,
      modalidade: dados.modalidade,
      endereco: dados.modalidade==='entrega' ? dados.endereco : null,
      pagamento: dados.pagamento,
      momentoPagamento: dados.momentoPagamento==='antecipado' ? 'Antecipado' : 'Na entrega/retirada',
      pagamentoSimulado: dados.pagamentoAprovado,
      cardMarca: SS.pagamento.cardMarca(dados),
      cardUltimos4: SS.pagamento.cardUltimos4(dados),
      observacoes: dados.observacoes
    };
    var msg=SS.whatsapp.montarMensagemBolo(pedido);
    SS.whatsapp.abrir(msg, true);
    SS.ui.toast('Abrindo WhatsApp… envie para receber o orçamento.');
    mostrarSucesso();
  }

  function mostrarSucesso(){
    var el=document.getElementById('bolo-conteudo');
    if(!el) return;
    el.innerHTML=
      '<div class="panel"><div class="panel__body"><div class="pag-confirmado" role="status">' +
        '<iconify-icon icon="ph:check-circle" width="48" height="48"></iconify-icon>' +
        '<h3>Obrigado! Seu pedido de bolo foi enviado pelo WhatsApp</h3>' +
        '<p>A mensagem formatada foi aberta no WhatsApp. A confeitaria responde com valor, prazo e confirmação em breve.</p>' +
        '<a class="btn btn--outline btn--lg mt-3" href="bolo-personalizado.html">Fazer novo orçamento</a> <a class="btn btn--primary btn--lg mt-3" href="index.html">Voltar ao início</a>' +
      '</div></div></div>';
    window.scrollTo({top:0, behavior:'smooth'});
  }

  document.addEventListener('DOMContentLoaded', function(){
    SS.catalog.db.aplicarConfiguracoes();
    render();
  });
})(window.SS);
