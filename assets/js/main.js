// assets/js/main.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-adicionar-livro');
  const listaLivros = document.getElementById('lista-livros');
  const campoBusca = document.getElementById('busca-livro');
  const mensagemStatus = document.getElementById('mensagem-status');
  const campoOrdenar = document.getElementById('ordenar-livros');
  const modal = document.getElementById('edit-modal');
  const formEditar = document.getElementById('form-editar-livro');
  const modalCloseBtns = document.querySelectorAll('.modal-close');
  const historyModal = document.getElementById('history-modal');

  const btnExportarJSON = document.getElementById('btn-exportar-json');
  const btnExportarCSV = document.getElementById('btn-exportar-csv');
  const btnImportar = document.getElementById('btn-importar');
  const importFileInput = document.getElementById('import-file-input');
  const paginationControls = document.getElementById('pagination-controls');

  const STORAGE_KEY = 'biblioteca_livros';
  const ITEMS_PER_PAGE = 12;

  let todosOsLivros = []; // Array para armazenar todos os livros da API
  let currentPage = 1;

  // --- Funções Utilitárias e de Renderização ---

  // Função para exibir mensagens de status
  function exibirMensagem(texto, tipo = 'sucesso') {
    mensagemStatus.textContent = texto;
    mensagemStatus.className = tipo; // 'sucesso' ou 'erro'
    setTimeout(() => {
      mensagemStatus.textContent = '';
      mensagemStatus.className = '';
    }, 3000);
  }

  // Função para calcular dias restantes
  function calcularDiasRestantes(dataDevolucao) {
    const hoje = new Date();
    const dataDev = new Date(dataDevolucao + 'T00:00:00'); // Evita problemas de fuso horário
    const diffTime = dataDev - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `<span class="status-emprestimo atrasado">Atrasado ${Math.abs(
        diffDays
      )} dias</span>`;
    } else if (diffDays === 0) {
      return `<span class="status-emprestimo hoje">Devolver hoje</span>`;
    } else if (diffDays === 1) {
      return `<span class="status-emprestimo">Devolve amanhã</span>`;
    } else {
      return `<span class="status-emprestimo">Faltam ${diffDays} dias</span>`;
    }
  }

  // Função para renderizar um livro na lista
  function renderizarLivro(livro) {
    const item = document.createElement('li');
    item.dataset.id = livro.id;

    const ano = livro.ano_publicacao
      ? `<span class="ano">(${livro.ano_publicacao})</span>`
      : '';
    const estante = livro.estante
      ? `<span class="estante">📍 ${livro.estante}</span>`
      : '';

    let statusLivro;
    let acoesLivro;

    const emprestimoAtivo = (livro.historicoEmprestimos || []).find(
      (e) => e.status === 'ativo'
    );

    if (emprestimoAtivo) {
      // Livro Emprestado
      const diasRestantes = calcularDiasRestantes(
        emprestimoAtivo.data_devolucao
      );
      statusLivro = `
        <div class="info-emprestimo">
          <span>Emprestado para: <strong>${emprestimoAtivo.aluno}</strong></span>
          ${diasRestantes}
        </div>
      `;
      item.classList.add('emprestado');
      acoesLivro = `<div class="botoes-container">
                      <button class="btn-acao btn-historico" data-livro-id="${livro.id}">Histórico</button>
                      <button class="btn-acao btn-devolver" data-livro-id="${livro.id}">Devolver</button>
                    </div>`;
    } else {
      // Livro Disponível
      statusLivro =
        '<span class="status-livro disponivel">✅ Disponível</span>';
      acoesLivro = `<div class="botoes-container">
                      <button class="btn-acao btn-editar" data-livro-id="${livro.id}">Editar</button>
                      <button class="btn-acao btn-excluir" data-livro-id="${livro.id}">Excluir</button>
                      <button class="btn-acao btn-historico" data-livro-id="${livro.id}">Histórico</button>
                      <button class="btn-acao btn-emprestar" data-livro-id="${livro.id}">Emprestar</button>
                    </div>`;
    }

    item.innerHTML = `
      <div class="info-principal">
        <span class="titulo-autor"><strong>${livro.titulo}</strong> <span class="ano">${ano}</span></span>
        <span class="autor-nome">${livro.autor}</span>
        ${estante}
      </div>
      <div class="status-container">
        ${statusLivro}
      </div>
      <div class="acoes-livro">
        ${acoesLivro}
      </div>
    `;
    listaLivros.appendChild(item);
  }

  // --- Função para ordenar os livros ---
  function ordenarLivros(criterio) {
    todosOsLivros.sort((a, b) => {
      // Trata valores nulos ou indefinidos para o ano
      const anoA = a.ano_publicacao || 0;
      const anoB = b.ano_publicacao || 0;

      switch (criterio) {
        case 'autor':
          // Garante que a ordenação funcione mesmo se o autor for nulo
          const autorA = a.autor || '';
          const autorB = b.autor || '';
          // localeCompare é ideal para ordenar strings alfabeticamente
          return autorA.localeCompare(autorB);
        case 'ano_desc':
          // Ordena do maior para o menor (mais recente primeiro)
          return anoB - anoA;
        case 'ano_asc':
          // Ordena do menor para o maior (mais antigo primeiro)
          return anoA - anoB;
        case 'titulo':
        default:
          // Padrão é ordenar por título
          const tituloA = a.titulo || '';
          const tituloB = b.titulo || '';
          return tituloA.localeCompare(tituloB);
      }
    });

    // Após ordenar, re-renderiza a lista, aplicando o filtro de busca atual
    filtrarEExibirLivros(campoBusca.value);
  }

  // --- Funções de Paginação ---
  function renderizarPaginacao(totalItems) {
    paginationControls.innerHTML = '';
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'pagination-btn';
      if (i === currentPage) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        currentPage = i;
        filtrarEExibirLivros(campoBusca.value);
      });
      paginationControls.appendChild(btn);
    }
  }

  // --- Função para filtrar e exibir os livros ---
  function filtrarEExibirLivros(termo = '') {
    const termoLower = termo.toLowerCase();

    const livrosFiltrados = todosOsLivros.filter(
      (livro) =>
        (livro.titulo || '').toLowerCase().includes(termoLower) ||
        (livro.autor || '').toLowerCase().includes(termoLower)
    );

    // Lógica de Paginação
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const livrosDaPagina = livrosFiltrados.slice(startIndex, endIndex);

    listaLivros.innerHTML = ''; // Limpa a lista atual

    if (livrosFiltrados.length === 0) {
      paginationControls.innerHTML = '';
      listaLivros.innerHTML =
        '<li>Nenhum livro encontrado para a sua busca.</li>';
    } else {
      livrosDaPagina.forEach(renderizarLivro);
      renderizarPaginacao(livrosFiltrados.length);
    }
  }

  // --- Funções CRUD e de Empréstimo ---

  // ... (Funções de Empréstimo, Devolução, Exclusão, Edição)

  async function emprestarLivro(livroId) {
    const aluno = prompt('Digite o nome do aluno:');
    if (!aluno) return; // Usuário cancelou

    const diasEmprestimo = parseInt(
      prompt('Por quantos dias o livro será emprestado?', '15')
    );
    // Validação Avançada
    if (isNaN(diasEmprestimo) || diasEmprestimo <= 0 || diasEmprestimo > 365) {
      exibirMensagem('Número de dias inválido.', 'erro');
      return;
    }

    const dataDevolucao = new Date();
    dataDevolucao.setDate(dataDevolucao.getDate() + diasEmprestimo);
    const dataFormatada = dataDevolucao.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    const livro = todosOsLivros.find((l) => l.id == livroId);
    if (livro) {
      const novoEmprestimo = {
        aluno: aluno,
        data_emprestimo: new Date().toISOString().split('T')[0],
        data_devolucao: dataFormatada,
        status: 'ativo',
      };
      livro.historicoEmprestimos.push(novoEmprestimo);
      salvarDadosNoStorage();
      exibirMensagem('Empréstimo registrado com sucesso!', 'sucesso');
      carregarLivros();
    } else {
      exibirMensagem('Livro não encontrado.', 'erro');
    }
  }

  async function devolverLivro(livroId) {
    if (!confirm('Deseja realmente registrar a devolução deste livro?')) return;

    const livro = todosOsLivros.find((l) => l.id == livroId);
    if (livro) {
      const emprestimoAtivo = livro.historicoEmprestimos.find(
        (e) => e.status === 'ativo'
      );
      if (emprestimoAtivo) {
        emprestimoAtivo.status = 'devolvido';
        emprestimoAtivo.data_devolucao_efetiva = new Date()
          .toISOString()
          .split('T')[0];
      }
      salvarDadosNoStorage();
      exibirMensagem('Devolução registrada com sucesso!', 'sucesso');
      carregarLivros();
    } else {
      exibirMensagem('Livro não encontrado.', 'erro');
    }
  }

  // --- Função para Excluir Livro ---
  async function excluirLivro(livroId) {
    if (
      !confirm(
        'Tem certeza que deseja excluir este livro permanentemente? Esta ação não pode ser desfeita.'
      )
    ) {
      return;
    }

    todosOsLivros = todosOsLivros.filter((l) => l.id != livroId);
    salvarDadosNoStorage();
    exibirMensagem('Livro excluído com sucesso!', 'sucesso');
    await carregarLivros();
  }

  // --- Funções para Edição de Livros ---

  function abrirModalEdicao(livroId) {
    const livro = todosOsLivros.find((l) => l.id == livroId);
    if (!livro) return;

    document.getElementById('edit-livro-id').value = livro.id;
    document.getElementById('edit-titulo').value = livro.titulo;
    document.getElementById('edit-autor').value = livro.autor;
    document.getElementById('edit-ano').value = livro.ano_publicacao || '';
    document.getElementById('edit-estante').value = livro.estante || '';

    modal.classList.add('visible');
  }

  function fecharModalEdicao() {
    modal.classList.remove('visible');
  }

  async function salvarEdicaoLivro(event) {
    event.preventDefault();

    const livroAtualizado = {
      id: document.getElementById('edit-livro-id').value,
      titulo: document.getElementById('edit-titulo').value,
      autor: document.getElementById('edit-autor').value,
      ano_publicacao: document.getElementById('edit-ano').value
        ? parseInt(document.getElementById('edit-ano').value)
        : null,
      estante: document.getElementById('edit-estante').value,
    };

    // Validação Avançada
    const anoAtual = new Date().getFullYear();
    if (
      livroAtualizado.ano_publicacao &&
      (livroAtualizado.ano_publicacao > anoAtual ||
        livroAtualizado.ano_publicacao < 1000)
    ) {
      alert('Por favor, insira um ano de publicação válido.');
      return;
    }

    const index = todosOsLivros.findIndex((l) => l.id == livroAtualizado.id);
    if (index !== -1) {
      // Mantém a informação de empréstimo, se existir
      livroAtualizado.historicoEmprestimos =
        todosOsLivros[index].historicoEmprestimos;
      todosOsLivros[index] = livroAtualizado;
      salvarDadosNoStorage();
      exibirMensagem('Livro atualizado com sucesso!', 'sucesso');
      fecharModalEdicao();
      await carregarLivros();
    } else {
      alert('Erro: Livro não encontrado para atualização.');
    }
  }

  // --- Funções de Persistência (localStorage) ---

  // Função para salvar o array de livros no localStorage
  function salvarDadosNoStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todosOsLivros));
  }

  // Função para carregar os livros da API
  async function carregarLivros() {
    try {
      const livrosJSON = localStorage.getItem(STORAGE_KEY);
      todosOsLivros = livrosJSON ? JSON.parse(livrosJSON) : [];

      currentPage = 1; // Reseta para a primeira página ao carregar
      // Ordena os livros com o critério padrão antes de exibi-los
      ordenarLivros(campoOrdenar.value);
      if (todosOsLivros.length === 0) {
        listaLivros.innerHTML = '<li>Nenhum livro cadastrado ainda.</li>';
      }
    } catch (error) {
      listaLivros.innerHTML = '<li>Erro ao carregar os livros.</li>';
      console.error('Erro:', error);
    }
  }

  // Função para adicionar um novo livro
  async function adicionarLivro(event) {
    event.preventDefault(); // Impede o recarregamento da página

    const titulo = document.getElementById('titulo').value;
    const autor = document.getElementById('autor').value;
    const ano = document.getElementById('ano').value;
    const estante = document.getElementById('estante').value;

    // Validação Avançada
    const anoAtual = new Date().getFullYear();
    const anoNum = ano ? parseInt(ano) : null;
    if (anoNum && (anoNum > anoAtual || anoNum < 1000)) {
      exibirMensagem('Por favor, insira um ano de publicação válido.', 'erro');
      return;
    }

    const novoLivro = {
      id: Date.now(), // Gera um ID único baseado no timestamp
      titulo: titulo,
      autor: autor,
      ano_publicacao: anoNum,
      estante: estante,
      historicoEmprestimos: [],
    };

    // Adiciona o novo livro ao array
    todosOsLivros.push(novoLivro);
    // Salva o array atualizado no localStorage
    salvarDadosNoStorage();

    await carregarLivros(); // Recarrega e re-renderiza a lista
    form.reset(); // Limpa o formulário
    exibirMensagem('Livro adicionado com sucesso!', 'sucesso');
  }

  // --- Funções de Importação e Exportação ---
  function exportarDados(formato) {
    if (todosOsLivros.length === 0) {
      exibirMensagem('Não há livros para exportar.', 'erro');
      return;
    }

    const dataStr = JSON.stringify(todosOsLivros, null, 2); // O '2' formata o JSON para ser legível
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    let dataStr;
    let blobType;
    let fileName;

    if (formato === 'json') {
      dataStr = JSON.stringify(todosOsLivros, null, 2);
      blobType = 'application/json';
      fileName = 'biblioteca_backup.json';
    } else if (formato === 'csv') {
      const header =
        'ID,Titulo,Autor,Ano,Estante,Status,EmprestadoPara,DataDevolucao\n';
      const rows = todosOsLivros
        .map((livro) => {
          const emprestimo = (livro.historicoEmprestimos || []).find(
            (e) => e.status === 'ativo'
          );
          const status = emprestimo ? 'Emprestado' : 'Disponível';
          const emprestadoPara = emprestimo ? emprestimo.aluno : '';
          const dataDevolucao = emprestimo ? emprestimo.data_devolucao : '';
          // Escapa vírgulas nos campos de texto
          const titulo = `"${livro.titulo.replace(/"/g, '""')}"`;
          const autor = `"${livro.autor.replace(/"/g, '""')}"`;
          return `${livro.id},${titulo},${autor},${
            livro.ano_publicacao || ''
          },${
            livro.estante || ''
          },${status},${emprestadoPara},${dataDevolucao}`;
        })
        .join('\n');
      dataStr = header + rows;
      blobType = 'text/csv;charset=utf-8;';
      fileName = 'biblioteca_backup.csv';
    }

    const dataBlob = new Blob([dataStr], { type: blobType });
    const url = URL.createObjectURL(dataBlob);

    const linkDownload = document.createElement('a');
    linkDownload.href = url;
    linkDownload.download = fileName;
    document.body.appendChild(linkDownload);
    linkDownload.click();
    document.body.removeChild(linkDownload);
    URL.revokeObjectURL(url);
    exibirMensagem('Dados exportados com sucesso!', 'sucesso');
  }

  function importarDeJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (
      !confirm(
        'A importação substituirá todos os dados atuais. Deseja continuar?'
      )
    ) {
      // Limpa o input para permitir selecionar o mesmo arquivo novamente
      event.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dadosImportados = JSON.parse(e.target.result);
        // Validação Avançada
        if (
          !Array.isArray(dadosImportados) ||
          (dadosImportados.length > 0 &&
            (!dadosImportados[0].id ||
              !dadosImportados[0].titulo ||
              !dadosImportados[0].autor))
        ) {
          throw new Error(
            'Formato de arquivo inválido. O JSON deve ser um array de livros com id, titulo e autor.'
          );
        }

        todosOsLivros = dadosImportados;
        salvarDadosNoStorage();
        carregarLivros();
        exibirMensagem('Dados importados com sucesso!', 'sucesso');
      } catch (error) {
        exibirMensagem(`Erro ao importar: ${error.message}`, 'erro');
      } finally {
        event.target.value = null;
      }
    };
    reader.readAsText(file);
  }

  // --- Funções do Modal de Histórico ---
  function abrirModalHistorico(livroId) {
    const livro = todosOsLivros.find((l) => l.id == livroId);
    if (!livro) return;

    document.getElementById('history-book-title').textContent = livro.titulo;
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';

    if (
      !livro.historicoEmprestimos ||
      livro.historicoEmprestimos.length === 0
    ) {
      historyList.innerHTML =
        '<li>Nenhum empréstimo registrado para este livro.</li>';
    } else {
      // Ordena para mostrar os mais recentes primeiro
      [...livro.historicoEmprestimos].reverse().forEach((emp) => {
        const item = document.createElement('li');
        item.innerHTML = `Emprestado para <strong>${emp.aluno}</strong> em ${emp.data_emprestimo}. Status: <strong>${emp.status}</strong>.`;
        historyList.appendChild(item);
      });
    }
    historyModal.classList.add('visible');
  }

  function fecharModais() {
    modal.classList.remove('visible');
    historyModal.classList.remove('visible');
  }

  // Adiciona os event listeners
  form.addEventListener('submit', adicionarLivro);
  campoBusca.addEventListener('input', (event) => {
    filtrarEExibirLivros(event.target.value);
  });
  campoOrdenar.addEventListener('change', (event) => {
    ordenarLivros(event.target.value);
  });
  formEditar.addEventListener('submit', salvarEdicaoLivro);
  modalCloseBtns.forEach((btn) => btn.addEventListener('click', fecharModais));
  [modal, historyModal].forEach((m) => {
    m.addEventListener('click', (event) => {
      if (event.target === m) fecharModais();
    });
  });

  btnExportarJSON.addEventListener('click', () => exportarDados('json'));
  btnExportarCSV.addEventListener('click', () => exportarDados('csv'));
  btnImportar.addEventListener('click', () => {
    // Aciona o clique no input de arquivo oculto
    importFileInput.click();
  });
  importFileInput.addEventListener('change', importarDeJSON);

  // Delegação de eventos para os botões de ação
  listaLivros.addEventListener('click', (event) => {
    const target = event.target;
    if (target.classList.contains('btn-emprestar')) {
      const livroId = target.dataset.livroId;
      emprestarLivro(livroId);
    } else if (target.classList.contains('btn-devolver')) {
      const livroId = target.dataset.livroId;
      devolverLivro(livroId);
    } else if (target.classList.contains('btn-editar')) {
      const livroId = target.dataset.livroId;
      abrirModalEdicao(livroId);
    } else if (target.classList.contains('btn-excluir')) {
      const livroId = target.dataset.livroId;
      excluirLivro(livroId);
    } else if (target.classList.contains('btn-historico')) {
      const livroId = target.dataset.livroId;
      abrirModalHistorico(livroId);
    }
  });

  // Carrega os livros ao iniciar a página
  carregarLivros();
});
