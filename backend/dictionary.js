// Dicionário local para validação rápida de palavras por categoria
// Sistema Híbrido de 3 Níveis — Inclusão Linguística Regional Brasileira
const fs   = require("fs");
const path = require("path");
const CATEGORIES = {
  escola: [
    "borracha", "caderno", "lapis", "caneta", "estojo", "regua", "mochila", "livro", "bloco", "papel", 
    "tesoura", "cola", "corretivo", "compasso", "transferidor", "giz", "lousa", "quadro", "apontador", 
    "pasta", "agenda", "lapiseira", "calculadora", "dicionario", "grampeador", "clips", "fita", 
    "carteira", "mesa", "cadeira", "atlas", "fichario", "tinta", "pincel", "gabarito", "corretor",
    "folha", "lapiceira", "compasso", "diario", "jaleco", "durex", "grampo", "perfurador"
  ],
  animais: [
    "cachorro", "gato", "leao", "tigre", "elefante", "girafa", "zebra", "macaco", "urso", "lobo", 
    "raposa", "coelho", "rato", "esquilo", "sapo", "cobra", "jacare", "tartaruga", "peixe", "tubarao", 
    "baleia", "golfinho", "passaro", "aguia", "falcao", "coruja", "pato", "ganso", "galinha", "galo", 
    "cavalo", "boi", "vaca", "ovelha", "cabra", "porco", "coala", "panda", "canguru", "camelo", 
    "hipopotamo", "rinoceronte", "leopardo", "pantera", "hiena", "castor", "lontra", "foca", "morsa", 
    "pinguim", "avestruz", "flamingo", "cisne", "gaviao", "morcego", "aranha", "escorpiao", "formiga", 
    "abelha", "vespa", "mosquito", "mosca", "borboleta", "mariposa", "grilo", "gafanhoto", "barata", 
    "caracol", "lesma", "polvo", "lula", "caranguejo", "lagosta", "camarao", "estrela-do-mar", 
    "agua-viva", "esponja", "coral", "avestruz", "bode", "búfalo", "burro", "camaleao", "chita", 
    "cegonha", "corvo", "cutia", "doninha", "ema", "esquilo", "faisao", "flamingo", "formiga", 
    "gaivota", "gazela", "gorila", "guaxinim", "hamster", "jacu", "jabuti", "jararaca", "javali", 
    "lagartixa", "lagarto", "lhama", "lince", "lontra", "lumbriga", "marreco", "mico", "minhoca", 
    "morcego", "mula", "namorado", "naja", "orca", "ouriço", "ostra", "ovelha", "paca", "pavao", 
    "pelicano", "periquito", "pernilongo", "peru", "pombo", "preguiça", "pulga", "pula-pula", 
    "quati", "rã", "raia", "salamandra", "salmao", "sanguessuga", "sardinha", "serpente", "siri", 
    "tatu", "touro", "truta", "tucano", "urubu", "veado", "vespa", "vira-lata", "vaga-lume"
  ],
  frutas: [
    "maca", "banana", "laranja", "morango", "uva", "melancia", "melao", "abacaxi", "pessego", "pera", 
    "limao", "lima", "tangerina", "mexerica", "maracuja", "manga", "mamao", "coco", "cereja", "ameixa", 
    "amora", "framboesa", "mirtilo", "kiwi", "figo", "goiaba", "caju", "caqui", "carambola", "cupuacu", 
    "graviola", "jaca", "jabuticaba", "pitanga", "acerola", "roma", "tamara", "damasco", "nespera", 
    "lichia", "physalis", "pitaia", "cacau", "abacate", "jambo", "jenipapo", "buriti", "pequi", 
    "tamarindo", "seriguela", "cajarana", "guarana", "murici", "graviola", "tucuma", "pupunha", 
    "sapoti", "romã", "umbu", "atemoia", "açaí", "framboesa", "groselha", "marmelo", "tangerina"
  ],
  paises: [
    "brasil", "argentina", "uruguai", "paraguai", "chile", "colombia", "venezuela", "equador", "peru", 
    "bolivia", "guiana", "suriname", "canada", "estados unidos", "mexico", "cuba", "jamaica", "haiti", 
    "panama", "costa rica", "honduras", "guatemala", "el salvador", "nicaragua", "portugal", "espanha", 
    "franca", "italia", "alemanha", "reino unido", "inglaterra", "escocia", "irlanda", "belgica", 
    "holanda", "suica", "austria", "grecia", "suecia", "noruega", "finlandia", "dinamarca", "polonia", 
    "russia", "ucrania", "turquia", "china", "japao", "coreia", "india", "paquistao", "vietna", 
    "tailandia", "indonesia", "filipinas", "australia", "nova zelandia", "egito", "africa do sul", 
    "nigeria", "quenia", "marrocos", "argelia", "tunisia", "libia", "angola", "mozambique", "madagascar", 
    "ira", "iraque", "arabia saudita", "israel", "palestina", "libano", "siria", "jordania", "catar", 
    "singapura", "malasia", "sri lanka", "nepal", "bangladesh", "mongolia", "tailandia", "iemen", 
    "oma", "emirados arabes", "croacia", "republica tcheca", "hungria", "romenia", "bulgaria", 
    "suica", "monaco", "luxemburgo", "islandia", "finlandia"
  ],
  filmes: [
    "titanic", "avatar", "matrix", "coringa", "shrek", "toy story", "frozen", "vingadores", "batman", 
    "homem aranha", "harry potter", "senhor dos aneis", "star wars", "interestelar", "inception", 
    "origem", "gladiador", "forest gump", "rei leao", "bela e a fera", "cinderela", "pequena sereia", 
    "tarzan", "mulan", "hercules", "carros", "ratatouille", "divertadamente", "coco", 
    "viva a vida e uma festa", "jurassic park", "tubarao", "psicose", "o poderoso chefao", "pulp fiction", 
    "clube da luta", "scarface", "o pianista", "a lista de schindler", "o show de truman", 
    "perdido em marte", "gravidade", "a chegada", "ex machina", "corra", "parasita", "crepusculo", 
    "velozes e furiosos", "mad max", "la la land", "interestelar", "coracao valente", "o resgate do soldado ryan", 
    "clube dos cinco", "de volta para o futuro", "os caça-fantasmas", "jumanji", "aladdin", "up", 
    "procurando nemo", "monstros sa", "os incriveis", "wall-e", "ratatouille", "divertida mente", 
    "vingadores", "pantera negra", "homem de ferro", "thor", "capitao america", "guardioes da galaxia"
  ],
  profissoes: [
    "medico", "enfermeiro", "dentista", "psicologo", "veterinario", "fisioterapeuta", "farmaceutico", 
    "engenheiro", "arquiteto", "advogado", "juiz", "promotor", "delegado", "policial", "bombeiro", 
    "militar", "professor", "diretor", "pedagogo", "programador", "desenvolvedor", "analista", 
    "designer", "ilustrador", "fotografo", "jornalista", "escritor", "editor", "tradutor", "ator", 
    "cantor", "musico", "dancarino", "pintor", "escultor", "cozinheiro", "chef", "garcom", "barman", 
    "padeiro", "confeiteiro", "cabeleireiro", "manicure", "maquiador", "esteticista", "massoterapeuta", 
    "costureiro", "alfaiate", "sapateiro", "eletricista", "encanador", "pedreiro", "carpinteiro", 
    "marceneiro", "mecanico", "motorista", "piloto", "comissario", "marinheiro", "pescador", 
    "agricultor", "pecuarista", "jardineiro", "gari", "carteiro", "porteiro", "seguranca", 
    "recepcionista", "secretario", "atendente", "vendedor", "gerente", "administrador", 
    "economista", "contador", "pesquisador", "cientista", "biologo", "quimico", "fisico", 
    "astronomo", "geologo", "arqueologo", "historiador", "sociologo", "filosofo"
  ],
  nome: [
    "Abel", "Abraão", "Adailton", "Adailson", "Adalberto", "Adão", "Ademar", "Ademilson", "Adenilson", "Adevaldo", "Adílson", "Adolfo", "Adonias", "Adriel", "Adriano", "Afonso", "Agenor", "Aguinaldo", "Ailton", "Alan", "Alencar", "Alessandro", "Alex", "Alexander", "Alexandre", "Alfeu", "Alfredo", "Alisson", "Allan", "Almir", "Aloísio", "Altair", "Álvaro", "Amadeu", "Amarildo", "Amauri", "Amaury", "Américo", "Amílcar", "Amilton", "Ananias", "Anderson", "André", "Andreas", "Andress", "Ângelo", "Aníbal", "Anísio", "Anselmo", "Antenor", "Antero", "Anthony", "Antônio", "Antony", "Apolônio", "Aquiles", "Araldo", "Arlindo", "Armando", "Arnaldo", "Arnóbio", "Arthur", "Artur", "Ary", "Átila", "Augusto", "Aureliano", "Aurélio", "Avelino", "Ayrton",
    "Baltazar", "Barnabé", "Bartolomeu", "Basílio", "Batista", "Belmiro", "Benedito", "Benício", "Benjamin", "Bento", "Bernardo", "Breno", "Brian", "Bruno",
    "Caetano", "Caio", "Caleb", "Camilo", "Cândido", "Carlinhos", "Carlos", "Casemiro", "Cássio", "Celso", "César", "Cezar", "Charles", "Christian", "Cristiano", "Cristóvão", "Cícero", "Cláudio", "Cleber", "Clebson", "Cleiton", "Clóvis", "Conrado", "Cosmo",
    "Dagoberto", "Dalton", "Damião", "Daniel", "Danilo", "Darcy", "Dário", "Darlan", "Davi", "David", "Deivid", "Deividi", "Demétrio", "Denilson", "Denis", "Dênis", "Denzel", "Derik", "Devanir", "Diego", "Dilson", "Dimas", "Diniz", "Diogo", "Dirceu", "Divaldo", "Djair", "Domênico", "Domingos", "Donizete", "Douglas", "Dudu", "Durval",
    "Eder", "Éderson", "Edgar", "Edgard", "Edilson", "Edimilson", "Edir", "Edmilson", "Ednael", "Ednaldo", "Edson", "Édson", "Eduardo", "Edvaldo", "Efraim", "Eider", "Elano", "Elcio", "Élcio", "Eldo", "Elenilson", "Elias", "Eliezer", "Élio", "Eliseu", "Elismar", "Elisson", "Elivelton", "Elizeu", "Eloi", "Elói", "Elton", "Élton", "Elvécio", "Elvis", "Emanuel", "Emerson", "Émerson", "Emílio", "Eneas", "Êneas", "Enio", "Ênio", "Enivaldo", "Enzo", "Eraldo", "Eric", "Éric", "Erick", "Érico", "Erik", "Érik", "Ernesto", "Esdras", "Estêvão", "Estevão", "Eudes", "Eugênio", "Eurico", "Evaldo", "Evandro", "Éverton", "Ewerton", "Expedito", "Ezequiel", "Ezio", "Ézio",
    "Fabiano", "Fábio", "Fabrício", "Fagner", "Faustino", "Fausto", "Felipe", "Felix", "Félix", "Fernando", "Fidel", "Filipe", "Firmino", "Flávia", "Flávio", "Floriano", "Fortunato", "Francesco", "Francisco", "Franco", "Fred", "Frederico",
    "Gabriel", "Gael", "George", "Geraldo", "Gerson", "Gérson", "Geovane", "Geovani", "Gian", "Gil", "Gilberto", "Gilmar", "Gilson", "Giovanni", "Giovanny", "Givanildo", "Glauco", "Gledson", "Gustavo", "Guto",
    "Haroldo", "Heitor", "Hélio", "Helder", "Hélder", "Henrique", "Herbert", "Hércules", "Hermes", "Hermínio", "Horácio", "Hudson", "Hugo", "Humberto",
    "Iago", "Ian", "Icaro", "Ícaro", "Igor", "Ígor", "Ildo", "Inácio", "Irineu", "Isaac", "Isac", "Isael", "Isaias", "Isaías", "Ismael", "Israel", "Italo", "Ítalo", "Itamar", "Ivan", "Ivandro", "Ivanilson", "Ivanildo", "Ivaldo",
    "Jaci", "Jacinto", "Jader", "Jadson", "Jael", "Jaime", "Jamil", "Jamilson", "Jander", "Jandir", "Jane", "Janio", "Jânio", "Januário", "Jari", "Jarbas", "Jason", "Jean", "Jefferson", "Jeremias", "Jessé", "Jesus", "Joabe", "Joaci", "João", "Joaquim", "Jobson", "Joel", "Joelmir", "Joelson", "John", "Johnny", "Jonas", "Jonathan", "Jonatas", "Jônatas", "Jordan", "Jorge", "Josué", "José", "Josef", "Joseph", "Josias", "Josildo", "Josimar", "Josivaldo", "Juan", "Juarez", "Julian", "Juliano", "Júlio", "Julio", "Juninho", "Júnior", "Junior", "Jurandir", "Juvêncio",
    "Kadu", "Kalel", "Karl", "Karlo", "Kaue", "Kauê", "Kauan", "Kayky", "Kelvin", "Kenji", "Kennedy", "Kevin", "Kleber", "Kleyton",
    "Laerte", "Laércio", "Lázaro", "Leandro", "Lécio", "Léo", "Leo", "Leônidas", "Leonardo", "Leonel", "Leopoldo", "Levi", "Liam", "Lincoln", "Luan", "Lucas", "Lucian", "Luciano", "Lúcio", "Lucio", "Luis", "Luís", "Luiz", "Lucca", "Lukas",
    "Maciel", "Magno", "Maicon", "Mário", "Mario", "Mailson", "Malcom", "Manoel", "Manuel", "Marcílio", "Marcio", "Márcio", "Marco", "Marcos", "Marcus", "Marlon", "Martin", "Martim", "Mateus", "Matheus", "Maurício", "Mauricio", "Mauro", "Max", "Maximiliano", "Maxwell", "Messias", "Micael", "Michel", "Miguel", "Milton", "Misael", "Moacir", "Moysés", "Moisés", "Murilo",
    "Nadir", "Nael", "Naim", "Nando", "Natan", "Natanael", "Nelson", "Nélson", "Neri", "Nestor", "Newton", "Nícolas", "Nicolas", "Nilson", "Nílson", "Nilton", "Nílton", "Nivaldo", "Noah", "Noé",
    "Odaír", "Odenir", "Odilon", "Odir", "Odirlei", "Odirley", "Olavo", "Olimpio", "Olímpio", "Olivério", "Olívia", "Olivio", "Olívio", "Omar", "Ondina", "Onofre", "Orestes", "Orlando", "Oscar", "Osmar", "Osvaldo", "Oswaldo", "Otávio", "Otavio", "Othon", "Otoniel", "Otto",
    "Pablo", "Paco", "Plinio", "Plínio", "Paulo", "Pedro", "Pietro",
    "Quirino", "Quintino",
    "Radamés", "Rafael", "Ragner", "Raimundo", "Ralf", "Ralph", "Ramon", "Ramires", "Ramiro", "Ramilson", "Randolfo", "Rangel", "Raphael", "Raul", "Reinaldo", "Renan", "Renato", "Renê", "Rene", "Ricardo", "Richard", "Rildo", "Rinaldo", "Ruan", "Ryan", "Rômulo", "Roberto", "Robson", "Rodolfo", "Rodrigo", "Roger", "Rogério", "Rogerio", "Romário", "Romeo", "Romeu", "Romulo", "Ronald", "Ronaldo", "Roney", "Roni", "Rony", "Roque", "Rubens", "Ruy",
    "Saulo", "Samuel", "Salvador", "Sandro", "Sancler", "Santiago", "Sebastião", "Segismundo", "Selton", "Serafim", "Sergino", "Sérgio", "Sergio", "Severino", "Sidney", "Silas", "Silvano", "Silvério", "Silvestre", "Sílvio", "Silvio", "Simão", "Simplicio", "Simplício", "Sivaldo", "Sócrates", "Solano",
    "Tadeu", "Tales", "Talles", "Tarcísio", "Tarcisio", "Tasso", "Teodoro", "Teófilo", "Thales", "Thiago", "Thomas", "Thomaz", "Tiago", "Tibúrcio", "Ticiano", "Timóteo", "Tito", "Tobias", "Tomás", "Tomas", "Tomé", "Tony", "Torquato", "Túlio", "Tulio",
    "Ubaldo", "Ubirajara", "Ubiratan", "Ulisses", "Uriel",
    "Valdemar", "Valdemir", "Valdir", "Valdo", "Valdomiro", "Valentin", "Valentim", "Valério", "Valter", "Válter", "Vander", "Vanderlei", "Vanderley", "Vando", "Vasco", "Venâncio", "Veríssimo", "Vicente", "Victor", "Vítor", "Vitor", "Vinícius", "Vinicius", "Virgílio", "Vital", "Vito", "Vitoriano", "Vladimir", "Volnei", "Volney",
    "Wagner", "Waldemar", "Waldir", "Walter", "Wanderlei", "Wanderley", "Washington", "Weliton", "Wellington", "Welington", "Wendell", "Wesley", "Willian", "William", "Wilson", "Wílson",
    "Yago", "Yuri", "Yann",
    "Zacarias", "Zaqueu", "Zeca", "Zenon", "Zózimo", "Ziza", "Zayra", "Zara", "Zaira", "Zeneide", "Zuleica", "Zilda", "Zilma", "Zélia", "Zulmira", "Zoraide", "Zenaide", "Zoraya", "Zizi", "Zina", "Zula", "Zelma", "Zélio", "Zander", "Zandor", "Zico", "Zeno", "Ziraldo", "Zilpa", "Zenilda", "Zuleide", "Zari", "Zarin", "Zalmir", "Zulma", "Zenio", "Zilio", "Zilton", "Zora",
    "Abigail", "Acácia", "Adélia", "Adelaide", "Adele", "Adelina", "Adriana", "Adriane", "Adrielly", "Ágatha", "Agda", "Agnes", "Aída", "Aila", "Aimeé", "Alana", "Alba", "Alberta", "Albertina", "Alcenir", "Alcina", "Alda", "Aldenora", "Aléxia", "Alessandra", "Alexandra", "Alexandrina", "Alexia", "Alice", "Alícia", "Alicia", "Alida", "Aline", "Alini", "Allison", "Alma", "Almerinda", "Altina", "Alzira", "Amália", "Amalia", "Amanda", "Amara", "Amélia", "Amelia", "Ana", "Anabel", "Anabela", "Anaís", "Analu", "Anastácia", "Andréa", "Andrea", "Andreia", "Andressa", "Andryelly", "Ângela", "Angela", "Angélica", "Angelica", "Angelina", "Antônia", "Antonia", "Antonieta", "Aparecida", "Araci", "Aracy", "Ariadny", "Ariadne", "Ariane", "Arielly", "Ariela", "Arlene", "Arlete", "Arline", "Assunta", "Astrid", "Augusta", "Áurea", "Aurea", "Aurélia", "Aurora",
    "Bárbara", "Barbara", "Beatriz", "Belmira", "Benedita", "Benigna", "Betânia", "Betina", "Bety", "Bianca", "Blandina", "Branca", "Brígida", "Bruna", "Brunela", "Brunella",
    "Cacilda", "Caetana", "Camila", "Carla", "Carlota", "Carina", "Karina", "Carmen", "Cármen", "Carol", "Carola", "Carolina", "Caroline", "Cassandra", "Catarina", "Cátia", "Katia", "Cecília", "Cecilia", "Celeste", "Célia", "Celia", "Celina", "Chantal", "Charlene", "Cibele", "Cybele", "Cícera", "Clara", "Clarice", "Clarissa", "Cláudia", "Claudia", "Claudete", "Claudine", "Claudinéia", "Cleide", "Cleonice", "Cleusa", "Cléo", "Cleo", "Clotilde", "Constança", "Constância", "Cora", "Corina", "Cosma", "Cristina", "Cristiana",
    "Daene", "Daiana", "Daiane", "Daisi", "Daisy", "Dália", "Dalia", "Dalila", "Dalva", "Damaris", "Daniela", "Danila", "Danusa", "Dara", "Darcy", "Darlene", "Davina", "Débora", "Debora", "Deise", "Djanira", "Dejanira", "Delma", "Denise", "Denize", "Diana", "Dilma", "Diná", "Dina", "Dinara", "Dinorá", "Dinora", "Dirce", "Dirlene", "Diva", "Divina", "Dóris", "Doris", "Dulce", "Dulcineia",
    "Edna", "Edneia", "Ednéia", "Edilene", "Edite", "Edith", "Elaine", "Elana", "Elba", "Elena", "Elen", "Ellen", "Elenice", "Eleonora", "Eliana", "Eliane", "Elisa", "Elisabete", "Elizabeth", "Elisângela", "Elisangela", "Elise", "Elza", "Emília", "Emilia", "Emily", "Emma", "Eneida", "Ênia", "Enid", "Erika", "Érika", "Erondina", "Esmeralda", "Estela", "Stella", "Estéfani", "Estefania", "Estefany", "Ester", "Esther", "Eugênia", "Eugenia", "Eulália", "Eulalia", "Eunice", "Eva", "Evangelina", "Evelyn", "Evandra",
    "Fabiana", "Fabíola", "Fabiola", "Fátima", "Fatima", "Felipa", "Fernanda", "Flávia", "Flavia", "Flor", "Flora", "Florbela", "Florence", "Francine", "Francisca", "Frederica",
    "Gabriela", "Gabriele", "Gabrielly", "Geovana", "Geovanna", "Gilda", "Gisele", "Gisela", "Gisely", "Gislene", "Giuliana", "Gláucia", "Glaucia", "Glória", "Gloria", "Graça", "Graciela", "Graziela", "Graziele", "Grazielle", "Guida", "Guiomar",
    "Haydée", "Hebe", "Heloísa", "Heloisa", "Helena", "Helen", "Helga", "Heloíse, Heloísa, Heloisa", "Hélia", "Herica", "Hérica", "Hermínia", "Herminia", "Herta", "Hilda", "Hortênsia", "Hortensia",
    "Iara", "Yara", "Iasmin", "Yasmin", "Ieda", "Ilda", "Ilma", "Ilza", "Inês", "Ines", "Inaiá", "Ingrid", "Iolanda", "Iracema", "Irene", "Íris", "Iris", "Isabel", "Isabela", "Isabella", "Isadora", "Isaura", "Isis", "Ísis", "Ivana", "Ivone", "Ivonete", "Ivy",
    "Jacira", "Jacqueline", "Jaqueline", "Jaciara", "Jaci", "Jacy", "Jade", "Jamile", "Jamili", "Janaína", "Janaina", "Jandira", "Jane", "Janete", "Jayme", "Jeane", "Jenifer", "Jennifer", "Jéssica", "Jessica", "Joana", "Joaninha", "Jocasta", "Joice", "Joyce", "Jordana", "Josélia", "Joselia", "Josefa", "Josefina", "Josiane", "Jovita", "Juana", "Júlia", "Julia", "Juliana", "Juliane", "Julie", "Julieta", "Junia", "Júnia", "Jussara",
    "Kamilly", "Karen", "Karina", "Karine", "Karoline", "Karolyn", "Kátia", "Katia", "Keila", "Kelly", "Kênia", "Kenia", "Kerolyn", "Ketlyn", "Ketilly",
    "Laís", "Lais", "Lara", "Larissa", "Laura", "Lauren", "Laurinda", "Lavínia", "Lavinia", "Léa", "Lea", "Leda", "Léia", "Leia", "Leila", "Lena", "Leocádia", "Leona", "Leonor", "Leonora", "Letícia", "Leticia", "Lia", "Liana", "Liane", "Licia", "Lícia", "Lídia", "Lidia", "Lígia", "Ligia", "Lilian", "Liliana", "Liliane", "Lina", "Linda", "Lindalva", "Line", "Lissa", "Lívia", "Livia", "Liz", "Liza", "Lorena", "Lorrane", "Lourdes", "Luana", "Luara", "Lúcia", "Lucia", "Luciana", "Lucilene", "Lucília", "Lucilia", "Lucinda", "Lucineia", "Lucinéia", "Lucrecia", "Lucrécia", "Lucy", "Ludmila", "Luísa", "Luisa", "Luiza", "Luíza", "Luma", "Lura", "Luzia", "Luzinete",
    "Madalena", "Mafalda", "Magali", "Magda", "Magnolia", "Mágna", "Magna", "Maiara", "Maira", "Maíra", "Maitê, Maite", "Malu", "Manuela", "Manuella", "Mara", "Marcela", "Marcelina", "Mácia", "Márcia", "Marcia", "Marcina", "Margarida", "Maria", "Mariah", "Mariana", "Mariane", "Marianne", "Maribel", "Marice", "Marilda", "Marilene", "Marília", "Marilia", "Marina", "Marinela", "Marinella", "Marisa", "Marise", "Marisol", "Maristela", "Mariza", "Marlene", "Marli", "Marly", "Marta", "Martha", "Mary", "Matilda", "Matilde", "Maura", "Maxima", "Mayara", "Mel", "Melânia", "Melania", "Melina", "Melinda", "Melissa", "Mercedes", "Mery", "Micaela", "Michele", "Michelle", "Milena", "Mileide", "Mirela", "Mirella", "Míriam", "Miriam", "Mirian", "Mirna", "Moema", "Mônica", "Monica", "Monique", "Muriel",
    "Nádia", "Nadia", "Nadine", "Nadir", "Naíde, Naide", "Nair", "Nanci", "Nancy", "Nara", "Natália", "Natalia", "Natalie", "Natalina", "Natana", "Natasha", "Natascha", "Natercia", "Natércia", "Nayara", "Nazaré", "Neli", "Nely", "Nelma", "Neusa", "Neuza", "Nice", "Nívea", "Nivea", "Noemi", "Noêmia", "Noemia", "Nora", "Norma",
    "Odete", "Odília, Odilia", "Ofélia, Ofelia", "Olga", "Olívia", "Olivia", "Olímpia, Olimpia", "Ondina", "Otília, Otilia",
    "Paloma", "Pamela", "Pâmela", "Paola", "Patrícia", "Patricia", "Paula", "Paulina", "Penélope", "Penelope", "Pérola", "Perla", "Petra", "Philippa", "Pietra", "Pilar", "Poliana", "Pollyana", "Priscila", "Priscilla",
    "Quitéria, Quiteria", "Quelita", "Queli",
    "Rafaela", "Rafaella", "Raimunda", "Raquel", "Rebeca", "Rebecca", "Regina", "Renata", "Riane", "Rita", "Roberta", "Rocha", "Romana", "Romilda", "Rosa", "Rosália", "Rosalia", "Rosalina", "Rosalinda", "Rosana", "Rosane", "Rosângela", "Rosangela", "Rose", "Roseane", "Roseli", "Rosely", "Rosemeire", "Rosimar", "Rosina", "Rute", "Ruth", "Rúbia", "Rubia",
    "Sabrina", "Sadia", "Salete", "Sally", "Salma", "Salomé", "Samara", "Samanta", "Samantha", "Samilla", "Samilly", "Sandra", "Sandrina", "Sandrine", "Sara", "Sarah", "Sarita", "Sásquia, Sasquia", "Scheila", "Sheila", "Shirley", "Sibele", "Cybele", "Silmara", "Sílvia", "Silvia", "Silvana", "Silvânia, Silvania", "Silene", "Silvina", "Simara", "Simone", "Simonetta", "Solana", "Solange", "Sônia", "Sonia", "Sofia", "Sophia", "Soraia", "Soraya", "Stela", "Stella", "Stephanie", "Stefany", "Sueli", "Suely", "Susana", "Suzana", "Suzanne", "Suzete", "Suzi", "Suzy", "Sybilla",
    "Tábata, Tabata", "Taci", "Taciana", "Taciane", "Tacy", "Tadeia", "Taís", "Tais", "Thaís", "Thais", "Tainá", "Taina", "Talita", "Thalita", "Tamara", "Tâmara", "Tânia", "Tania", "Tarsila", "Tatiana", "Tatiane", "Tatyane", "Teresa", "Tereza", "Teresinha", "Terezinha", "Thaísa, Thaisa", "Thalassa", "Thelma", "Telma", "Thereza", "Tiara", "Tuane", "Tuany",
    "Ula", "Ully", "Umbelina", "Úrsula", "Ursula",
    "Valdete", "Valdira", "Valdirene", "Valéria", "Valeria", "Valentina", "Valquíria, Valquiria", "Vanderléia, Vanderleia", "Vanesa", "Vanessa", "Vânia", "Vania", "Vanusa", "Vanúzia, Vera", "Verônica", "Veronica", "Vicente", "Victória", "Victoria", "Vítoria, Vitoria", "Vida", "Vilma", "Virgília, Virginia", "Vivian", "Viviana", "Viviane", "Vivi", "Vladia",
    "Waldira", "Walkiria", "Walquíria", "Wanda", "Wanessa", "Wânia", "Wania", "Welida, Wélida", "Wendy", "Wilhelmina",
    "Xaviera", "Xena", "Xênia", "Xenia", "Xiomara",
    "Yara", "Iara", "Yasmin", "Iasmin", "Yone", "Yolanda", "Yvone",
    "Zélia", "Zelia", "Zenaide", "Zilda", "Zilma", "Zita", "Zobaida", "Zoé", "Zoe", "Zoraida", "Zula", "Zuleica", "Zuleika", "Zulmira"
  ],
  objeto: [
    "armario", "aparelho", "agulha", "anel", "alfinete", "aviao", "ancora", "almofada", "abajur",
    "banco", "balde", "bola", "boneca", "bolsa", "bacia", "bateria", "botao", "binoculo", "bule",
    "cama", "cadeira", "copo", "caneta", "caderno", "colher", "chave", "computador", "celular", "corda", "cabide", "caixa",
    "dado", "disco", "dicionario", "disquete", "dedal", "ducha",
    "espelho", "estojo", "escova", "esponja", "envelope", "extintor", "escada",
    "faca", "fita", "fogao", "ferro", "folha", "funil", "flauta",
    "garfo", "garrafa", "giz", "gaiola", "gaveta", "guarda-chuva", "gaita",
    "helice", "harpa", "hidrante",
    "isqueiro", "impressora", "iman",
    "janela", "jarra", "jogo", "jornal",
    "kiwi", "ketchup",
    "lustre", "lapis", "livro", "lousa", "lanterna", "lupa", "lixeira", "lapiseira",
    "mesa", "mochila", "mouse", "martelo", "maleta", "microfone", "moeda", "mola", "manta",
    "navalha", "notebook", "novelo",
    "oculos", "oleo", "ouro",
    "prato", "panela", "papel", "pasta", "pincel", "pente", "prego", "parafuso", "peteca", "pilha",
    "quadro", "quadrante", "quebra-cabeca",
    "relogio", "regua", "radio", "rodo", "raspador",
    "sapato", "sacola", "sofa", "sino", "selo", "serra", "seringa", "sabonete",
    "tesoura", "telefone", "teclado", "tampa", "tinta", "travesseiro", "tijolo", "tela", "taca",
    "urna", "utensilio",
    "vaso", "vela", "vassoura", "ventilador", "vidro", "violao", "valvula",
    "webcam", "whisky",
    "xicara", "xale", "xadrez", "xilofone",
    "ziper"
  ],
  cor: [
    "azul", "amarelo", "verde", "vermelho", "rosa", "roxo", "laranja", "marrom", "preto", "branco", 
    "cinza", "violeta", "indigo", "lilas", "bege", "turquesa", "ciano", "magenta", "dourado", 
    "prateado", "salmao", "carmin", "coral", "purpura", "bronze", "esmeralda", "vinho", "creme",
    "amestista", "fucsia", "mostarda", "oliva", "perola", "pessego", "terracota"
  ],
  comida: [
    "arroz","feijao","macarrao","carne","frango","peixe","salada","sopa","pizza","hamburguer",
    "batata","pao","queijo","presunto","ovo","bolo","torta","sorvete","chocolate","biscoito",
    "bolacha","fruta","lasanha","pastel","coxinha","empada","pipoca","brigadeiro","pudim",
    "gelatina","farofa","strogonoff","sushi","guacamole","taco","yakisoba","panqueca",
    "crepe","waffle","fondue","azeitona","alface","alho","cebola","tomate","cenoura",
    "churrasco","linguica","salsicha","pure","omelete","polenta","nhoque",
    "misto-quente","esfiha","quibe","croquete","pao-de-queijo","panetone","rabanada",
    "amendoim","castanha","mel","geleia","iogurte","manteiga","requeijao",
    // NORDESTE
    "macaxeira","aipim","mandioca","mandioquinha","macaxeira-cozida","macaxeira-frita",
    "carne-de-sol","carne-seca","charque","carne-do-sol","carne-de-bode","carne-de-fumeiro",
    "buchada","sarapatel","panelada","mocoto","dobradinha","mocofava","rabada",
    "baiao-de-dois","baiao","cuscuz","cuscuz-nordestino","cuscuz-de-milho",
    "tapioca","beiju","beiju-de-coco","tapioca-de-queijo","beiju-seco",
    "coalho","queijo-coalho","queijo-de-manteiga","queijo-de-bola","queijo-de-minas",
    "mungunza","canjica","curau","pamonha","pamonha-de-queijo","bolo-de-milho",
    "feijao-verde","feijao-de-corda","feijao-macassar","feijao-fradinho",
    "arrumadinho","caldo-de-mocoto","bode-assado","galinha-caipira","galinha-de-cabidela",
    "cartola","bolo-de-macaxeira","cocada","cocada-branca","cocada-queimada","rapadura","xerem",
    "vatapa","caruru","acaraje","abara","moqueca","moqueca-de-peixe","moqueca-de-camarao",
    "bobo-de-camarao","xinxim-de-galinha","peixada","caldeirada","marisco","sururu",
    "bolo-de-rolo","cocada","paoca","pe-de-moleque",
    // NORTE
    "tacaca","pato-no-tucupi","pirarucu","pirarucu-de-casaca","acai","acai-na-tigela",
    // SUL E SUDESTE
    "barreado","galeto","arroz-carreteiro","chimarrao","mate","terere",
    "virado-a-paulista","tutu-de-feijao","torresmo","pernil",
    "linguica-toscana","pastel-de-feira","caldo-de-cana",
    // CENTRO-OESTE
    "empadao-goiano","sopa-paraguaia","arroz-com-pequi","pacu-assado","frango-com-pequi",
    // GERAL
    "pirao","feijoada","angu","galinhada","caldo-verde","caldo-de-feijao",
    "bife","bife-acebolado","carne-assada","lingua-ao-molho","escondidinho",
    "batata-frita","batata-doce","inhame","cara","milho-verde","milho-cozido",
    "bolo-de-fuba","bolo-de-cenoura","bolo-de-chocolate","bolo-de-banana","bolo-de-limao",
    "doce-de-leite","doce-de-coco","doce-de-abobora","goiabada","marmelada",
    "feijao-tropeiro","farofa-de-manteiga","arroz-com-feijao","frango-assado","leitao-assado",
    "ensopado","peixe-frito","file-de-peixe","ceviche","caldinho"
  ]
};

// ============================================================
// LISTA NEGRA — Palavrões bloqueados
// ============================================================
const BLACKLIST = new Set([
  "puta","puto","merda","bosta","cu","buceta","xota","xoxota","viado","viadao",
  "corno","cornao","porra","caralho","fdp","arrombado","babaca","imbecil","cuzao",
  "otario","desgraca","foder","foda","fodase","putaria","safada","safado",
  "vagabundo","vagabunda","piranha","prostituta","pimba","rola"
]);

// Cache de resultados da API (evita consultas repetidas)
const apiCache = new Map();

// Remove acentos e converte para caixa baixa, limpando espaços
function normalizeString(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();
}

// Detecta spam/sequências inválidas
function isSpam(word) {
  if (!word || word.length < 2) return true;
  if (/^\d+$/.test(word)) return true;
  if (/^(.)\1+$/.test(word)) return true;
  if (!/[aeiouy]/.test(word)) return true;
  const keyboardJunk = ["qwerty","asdfg","zxcvb","qazwsx","asdfjkl","poiuyt","lkjhgf","mnbvcx"];
  for (const junk of keyboardJunk) { if (word.includes(junk)) return true; }
  if (/[^aeiouy]{6,}/.test(word)) return true;
  if (/^(.{1,3})\1{3,}$/.test(word)) return true;
  return false;
}

function isBlacklisted(word) { return BLACKLIST.has(word); }

/**
 * Valida se uma palavra pertence a uma determinada categoria e atende
 * à restrição opcional de letra inicial.
 * @param {string} word Palavra fornecida pelo jogador
 * @param {string} category Categoria do tema
 * @param {string|null} letter Restrição de letra inicial (opcional)
 * @returns {boolean} Se a palavra é válida
 */
// Helper para consultar API do IBGE de forma assíncrona (com timeout)
async function checkIBGEName(name) {
  const url = `https://servicodados.ibge.gov.br/api/v2/censodemografico/nomes/${encodeURIComponent(name)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 800); // 800ms de timeout para não travar a bomba
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.status === 200) {
      const data = await response.json();
      // Se retornar um array com pelo menos 1 registro, o nome existe no Brasil
      return Array.isArray(data) && data.length > 0;
    }
  } catch (err) {
    // Caso de timeout, erro de rede, ou 503 do IBGE
  }
  return false;
}

async function validateWord(word, category, letter) {
  if (!word) return false;
  
  const normalizedWord = normalizeString(word);
  if (normalizedWord.length === 0) return false;

  // 1. Verifica restrição de letra inicial se existir
  if (letter) {
    const normalizedLetter = normalizeString(letter);
    if (!normalizedWord.startsWith(normalizedLetter)) {
      return false;
    }
  }

  // 2. Se a categoria não estiver definida, ou for "qualquer", aprova (contanto que cumpra a letra)
  if (!category || category === "qualquer") {
    return true;
  }

  const categoryWords = CATEGORIES[category];
  if (!categoryWords) {
    // Se for uma categoria customizada que não temos pré-salva, aceitamos por padrão
    // (o que permite ao jogo ter temas abertos)
    return true;
  }

  // 3. Verifica se a palavra está na lista local
  const existsLocal = categoryWords.some(catWord => normalizeString(catWord) === normalizedWord);
  if (existsLocal) {
    return true;
  }

  // 4. Se for a categoria de "nome" e não estiver no dicionário local, tenta validar na API de Nomes do IBGE
  if (category === "nome") {
    const isValidIBGE = await checkIBGEName(normalizedWord);
    if (isValidIBGE) {
      // Adiciona o nome válido ao dicionário local em memória para futuras verificações instantâneas
      categoryWords.push(word);
      return true;
    }
  }

  return false;
}

// ============================================================
// NÍVEL 2 — API WIKTIONARY PT
// ============================================================
async function checkWiktionary(word) {
  if (apiCache.has(word)) return apiCache.get(word);
  const url = "https://pt.wiktionary.org/w/api.php?action=query&titles=" + encodeURIComponent(word) + "&format=json&origin=*";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) { apiCache.set(word, false); return false; }
    const data = await response.json();
    const pages = data && data.query && data.query.pages;
    if (!pages) { apiCache.set(word, false); return false; }
    const pageIds = Object.keys(pages);
    if (pageIds.length === 0) { apiCache.set(word, false); return false; }
    const exists = !pages[pageIds[0]].missing;
    apiCache.set(word, exists);
    return exists;
  } catch (err) {
    clearTimeout(timeoutId);
    apiCache.set(word, false);
    return false;
  }
}

// ============================================================
// NÍVEL 3 — PALAVRAS PENDENTES (aprendizado)
// ============================================================
const PENDING_FILE = path.join(__dirname, "pending_words.json");
let pendingWords = {};
function loadPendingWords() {
  try {
    if (fs.existsSync(PENDING_FILE)) {
      pendingWords = JSON.parse(fs.readFileSync(PENDING_FILE, "utf8"));
    }
  } catch (e) { pendingWords = {}; }
}
loadPendingWords();

function savePendingWord(word, category) {
  const normWord = normalizeString(word);
  const key = normWord + "|" + category;
  if (!pendingWords[key]) {
    pendingWords[key] = { word, category, uses: 0, approvals: 0, rejections: 0 };
  }
  pendingWords[key].uses += 1;
  pendingWords[key].approvals += 1;
  if (pendingWords[key].approvals >= 5 && CATEGORIES[category]) {
    const already = CATEGORIES[category].some(w => normalizeString(w) === normWord);
    if (!already) {
      CATEGORIES[category].push(word);
      console.log("[Dicionário] '" + word + "' auto-aprovada para '" + category + "' (>= 5 usos).");
    }
  }
  fs.writeFile(PENDING_FILE, JSON.stringify(pendingWords, null, 2), () => {});
}

// ============================================================
// VALIDAÇÃO HÍBRIDA — FUNÇÃO PRINCIPAL (3 NÍVEIS)
// ============================================================
async function validateWordHybrid(word, category, letter) {
  if (!word) return { valid: false, reason: "Palavra vazia." };
  const normalizedWord = normalizeString(word);
  if (normalizedWord.length === 0) return { valid: false, reason: "Palavra inválida." };

  // Restrição de letra inicial
  if (letter) {
    const normalizedLetter = normalizeString(letter);
    if (!normalizedWord.startsWith(normalizedLetter)) {
      return { valid: false, reason: 'A palavra deve começar com "' + letter.toUpperCase() + '".'};
    }
  }

  // Palavrão → rejeição imediata
  if (isBlacklisted(normalizedWord)) return { valid: false, reason: "Palavra não permitida." };

  // Categoria aberta
  if (!category || category === "qualquer") {
    if (isSpam(normalizedWord)) return { valid: false, reason: "Sequência inválida." };
    return { valid: true, level: 1 };
  }

  const categoryWords = CATEGORIES[category];

  // Categoria customizada sem lista
  if (!categoryWords) {
    if (isSpam(normalizedWord)) return { valid: false, reason: "Sequência inválida." };
    return { valid: true, level: 1 };
  }

  // NÍVEL 1: dicionário local
  const existsLocal = categoryWords.some(w => normalizeString(w) === normalizedWord);
  if (existsLocal) return { valid: true, level: 1 };

  // NÍVEL 2a: IBGE (apenas nomes)
  if (category === "nome") {
    const isIBGE = await checkIBGEName(normalizedWord);
    if (isIBGE) { categoryWords.push(word); return { valid: true, level: 2, source: "IBGE" }; }
  }

  // NÍVEL 2b: Wiktionary
  const isWiki = await checkWiktionary(normalizedWord);
  if (isWiki) { categoryWords.push(word); return { valid: true, level: 2, source: "Wiktionary" }; }

  // NÍVEL 3: provisório
  if (normalizedWord.length >= 4 && !isSpam(normalizedWord)) {
    return { valid: true, level: 3, provisional: true };
  }

  return { valid: false, reason: "Palavra não encontrada para esta categoria." };
}

// Calcula distância Levenshtein para corretor ortográfico
function getEditDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Encontra sugestão de correção ortográfica ou palavra alternativa
function findCorrectionSuggestion(word, category, letter, usedWords) {
  if (!category || category === "qualquer") return null;

  const words = CATEGORIES[category] || [];
  const normalizedInput = normalizeString(word);
  const normalizedLetter = letter ? normalizeString(letter) : null;
  const normalizedUsed = usedWords.map(w => normalizeString(w.word));

  // Filtra opções válidas que não foram usadas e cumprem a letra inicial (se aplicável)
  const options = words.filter(w => {
    const norm = normalizeString(w);
    if (normalizedLetter && !norm.startsWith(normalizedLetter)) {
      return false;
    }
    return !normalizedUsed.includes(norm);
  });

  if (options.length === 0) return null;

  // Se o input estiver vazio, sorteia uma sugestão aleatória (útil para palavras repetidas)
  if (!normalizedInput) {
    return options[Math.floor(Math.random() * options.length)];
  }

  // Busca a palavra com menor distância Levenshtein
  let bestWord = null;
  let bestDistance = Infinity;

  options.forEach(opt => {
    const normOpt = normalizeString(opt);
    const dist = getEditDistance(normalizedInput, normOpt);
    if (dist < bestDistance && dist <= 3) { // Limita a no máximo 3 erros
      bestDistance = dist;
      bestWord = opt;
    }
  });

  // Se não achou por distância próxima, sugere uma aleatória como ajuda
  return bestWord || options[Math.floor(Math.random() * options.length)];
}

module.exports = {
  CATEGORIES,
  BLACKLIST,
  normalizeString,
  validateWord,          // retrocompatível
  validateWordHybrid,    // novo sistema híbrido de 3 níveis
  savePendingWord,
  getEditDistance,
  findCorrectionSuggestion
};
