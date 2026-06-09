/* Insere os pedidos REAIS de 01/06 até hoje (08/06) extraídos da lista da Nuvemshop.
   Substitui os 48 placeholders sintéticos.

   IMPORTANTE: aqui o cálculo considera os dois gateways da Pietra:
   - Nuvem Pago: cartão 2.99% + R$0.35 / PIX 0.99% / boleto R$2.39
   - Mercado Pago: cartão 4.49% + R$0.35 / PIX 0.99% / boleto R$2.39
   - Em espécie: 0% taxa de gateway

   Roda: pnpm tsx scripts/seed-pedidos-junho-real.ts */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

type Pedido = {
  numero: number;
  dia: number; // dia do mês (junho)
  hora: number;
  min: number;
  cliente: string;
  total: number;
  qtdItens: number;
  meio: 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'boleto';
  gateway: 'nuvem_pago' | 'mercado_pago' | 'cash';
  status: 'paid' | 'cancelled' | 'refunded_partial';
};

// Dados extraídos da listagem que a Pietra mandou
const PEDIDOS: Pedido[] = [
  // 8 jun
  { numero: 38713, dia: 8, hora: 22, min: 34, cliente: 'Mariana Telles França', total: 285.48, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38712, dia: 8, hora: 22, min: 15, cliente: 'Deborah Ribeiro', total: 74.23, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38710, dia: 8, hora: 21, min: 42, cliente: 'Manoella Aparecida Ferreira Da Silveira', total: 553.60, qtdItens: 4, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38709, dia: 8, hora: 21, min: 17, cliente: 'Thanity Munhoz', total: 167.23, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38708, dia: 8, hora: 21, min: 16, cliente: 'Gerlane Oliveira De Brito', total: 370.90, qtdItens: 5, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38707, dia: 8, hora: 21, min: 16, cliente: 'Isabella Rolfsen', total: 170.36, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38706, dia: 8, hora: 21, min: 0, cliente: 'Kaila Lopes', total: 286.16, qtdItens: 2, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38705, dia: 8, hora: 20, min: 22, cliente: 'Maria Victoria Rodrigues De Oliveira', total: 277.13, qtdItens: 2, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38704, dia: 8, hora: 20, min: 14, cliente: 'Alexandra Ribeiro', total: 359.50, qtdItens: 5, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38703, dia: 8, hora: 19, min: 40, cliente: 'Aline Ayume', total: 294.51, qtdItens: 4, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38702, dia: 8, hora: 19, min: 7, cliente: 'Nathally Menezes', total: 169.38, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38701, dia: 8, hora: 18, min: 31, cliente: 'Laiza Sales', total: 489.70, qtdItens: 3, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38700, dia: 8, hora: 17, min: 58, cliente: 'Ana Barreto', total: 131.97, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38699, dia: 8, hora: 17, min: 49, cliente: 'Ana Kyriazi', total: 102.74, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38698, dia: 8, hora: 17, min: 37, cliente: 'Laura Grochevits', total: 169.38, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38697, dia: 8, hora: 17, min: 28, cliente: 'Sabrina Sardote', total: 256.21, qtdItens: 3, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38696, dia: 8, hora: 16, min: 50, cliente: 'Sabrina Sardote', total: 133.54, qtdItens: 2, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38695, dia: 8, hora: 16, min: 45, cliente: 'Laiza Sales', total: 489.70, qtdItens: 3, meio: 'credit_card', gateway: 'mercado_pago', status: 'cancelled' },
  { numero: 38694, dia: 8, hora: 16, min: 40, cliente: 'Laiza Sales', total: 489.70, qtdItens: 3, meio: 'credit_card', gateway: 'mercado_pago', status: 'cancelled' },
  { numero: 38693, dia: 8, hora: 16, min: 18, cliente: 'Julia Theodoro', total: 663.01, qtdItens: 5, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38692, dia: 8, hora: 15, min: 41, cliente: 'Isabella Siqueira', total: 267.13, qtdItens: 2, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38691, dia: 8, hora: 14, min: 52, cliente: 'Ieda Farias', total: 167.23, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38690, dia: 8, hora: 14, min: 52, cliente: 'Ana Flávia Mattos', total: 339.80, qtdItens: 2, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38689, dia: 8, hora: 14, min: 34, cliente: 'Vilma Vaz', total: 299.24, qtdItens: 3, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38688, dia: 8, hora: 13, min: 11, cliente: 'Ana Luisa Mello', total: 409.80, qtdItens: 2, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38687, dia: 8, hora: 11, min: 44, cliente: 'Larissa Ingrid Della Vedova', total: 402.41, qtdItens: 3, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38686, dia: 8, hora: 11, min: 5, cliente: 'Flávia Poleto Bortolini', total: 31.25, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38685, dia: 8, hora: 8, min: 37, cliente: 'Andressa Aguiar De Lucena', total: 155.46, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38684, dia: 8, hora: 8, min: 22, cliente: 'Carla Andrade', total: 167.23, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38683, dia: 8, hora: 1, min: 28, cliente: 'Daniella Caldeira', total: 174.32, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  // 7 jun
  { numero: 38682, dia: 7, hora: 22, min: 18, cliente: 'Jovannia Maria', total: 230.99, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38681, dia: 7, hora: 22, min: 14, cliente: 'Jovannia Maria', total: 230.99, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'cancelled' },
  { numero: 38680, dia: 7, hora: 12, min: 41, cliente: 'Adriano Berto Da Silva Simplicio', total: 119.71, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38679, dia: 7, hora: 11, min: 34, cliente: 'Livia Gomes', total: 230.99, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38678, dia: 7, hora: 1, min: 51, cliente: 'Miguel Mendes', total: 689.60, qtdItens: 4, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  // 6 jun
  { numero: 38677, dia: 6, hora: 22, min: 11, cliente: 'Renata Carmo', total: 31.09, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38676, dia: 6, hora: 20, min: 27, cliente: 'Priscila Pinheiro De Lima', total: 167.23, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38674, dia: 6, hora: 18, min: 42, cliente: 'Roseli Machado', total: 338.86, qtdItens: 3, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38673, dia: 6, hora: 18, min: 5, cliente: 'Gabriela Rodrigues', total: 184.20, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38672, dia: 6, hora: 16, min: 44, cliente: 'Hillari Maria Albano Bonani', total: 244.52, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38671, dia: 6, hora: 15, min: 4, cliente: 'Rebecca Chateaubriand', total: 137.46, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38670, dia: 6, hora: 14, min: 11, cliente: 'Gabrielly Medeiros', total: 147.23, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38669, dia: 6, hora: 13, min: 39, cliente: 'Kauan Barbosa', total: 207.23, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38668, dia: 6, hora: 13, min: 19, cliente: 'Livia Brasil', total: 126.00, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38667, dia: 6, hora: 12, min: 47, cliente: 'Laryssa Soares', total: 201.97, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38666, dia: 6, hora: 12, min: 39, cliente: 'Rafaela Dos Santos', total: 199.90, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38665, dia: 6, hora: 12, min: 38, cliente: 'Nayara Caroline', total: 189.90, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38663, dia: 6, hora: 11, min: 10, cliente: 'Maria Eduarda Sobral', total: 170.35, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38661, dia: 6, hora: 9, min: 6, cliente: 'Layna Bianca', total: 216.88, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38660, dia: 6, hora: 0, min: 20, cliente: 'Emanuele Dantas', total: 554.90, qtdItens: 3, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  // 5 jun
  { numero: 38659, dia: 5, hora: 20, min: 41, cliente: 'Larissa Favero Poletti', total: 325.31, qtdItens: 2, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38658, dia: 5, hora: 19, min: 2, cliente: 'Luana Sastres', total: 146.68, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38657, dia: 5, hora: 18, min: 30, cliente: 'Melissa Pereira', total: 188.79, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38656, dia: 5, hora: 17, min: 48, cliente: 'Ana Beatriz Beatriz', total: 180.40, qtdItens: 1, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38655, dia: 5, hora: 17, min: 45, cliente: 'Alice B Rodrigues', total: 259.90, qtdItens: 1, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38654, dia: 5, hora: 17, min: 42, cliente: 'Giuliane Alves Da Silva', total: 207.23, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38653, dia: 5, hora: 17, min: 19, cliente: 'Aline Dos Santos Bonfim', total: 119.90, qtdItens: 1, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38652, dia: 5, hora: 16, min: 57, cliente: 'Bruna Pereira Arruda', total: 159.90, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38651, dia: 5, hora: 16, min: 24, cliente: 'Priscila Gomes', total: 207.23, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38650, dia: 5, hora: 16, min: 12, cliente: 'Gabriela França', total: 143.51, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38649, dia: 5, hora: 15, min: 38, cliente: 'Larissa Ferreira De Souza', total: 228.79, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'refunded_partial' },
  { numero: 38648, dia: 5, hora: 15, min: 27, cliente: 'Larissa Francielle', total: 249.80, qtdItens: 2, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38647, dia: 5, hora: 14, min: 2, cliente: 'Dhayane Lopes', total: 152.90, qtdItens: 1, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38646, dia: 5, hora: 13, min: 45, cliente: 'Thayna Yassuda', total: 179.90, qtdItens: 1, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38644, dia: 5, hora: 10, min: 31, cliente: 'Vinicius Leone Rodrigues Ribeiro', total: 226.26, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38643, dia: 5, hora: 9, min: 20, cliente: 'Morgana Soares', total: 169.49, qtdItens: 3, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38642, dia: 5, hora: 8, min: 52, cliente: 'Ana Gabriele Rodrigues Da Silva', total: 193.64, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38641, dia: 5, hora: 6, min: 54, cliente: 'Ianca De Souza Araújo', total: 152.90, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38640, dia: 5, hora: 1, min: 4, cliente: 'Leticia Morgado', total: 159.73, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  // 4 jun
  { numero: 38639, dia: 4, hora: 23, min: 23, cliente: 'Maria Nascimento', total: 158.85, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38638, dia: 4, hora: 22, min: 57, cliente: 'Tamara Fernandes', total: 380.70, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38637, dia: 4, hora: 21, min: 29, cliente: 'Nathalia Souza', total: 493.71, qtdItens: 3, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38636, dia: 4, hora: 21, min: 25, cliente: 'Catharina Lanças', total: 128.16, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38635, dia: 4, hora: 20, min: 30, cliente: 'Marina Lopes Da Rocha', total: 110.41, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38634, dia: 4, hora: 19, min: 54, cliente: 'Jakeline Almeida', total: 293.47, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38633, dia: 4, hora: 17, min: 58, cliente: 'Juliana Facundes Toloza', total: 139.90, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38632, dia: 4, hora: 17, min: 51, cliente: 'Juliana Facundes Toloza', total: 519.70, qtdItens: 3, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38631, dia: 4, hora: 17, min: 47, cliente: 'Raylane Lima Lima', total: 305.83, qtdItens: 2, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38630, dia: 4, hora: 17, min: 6, cliente: 'Karla Kinsley Crisia', total: 160.12, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38629, dia: 4, hora: 16, min: 10, cliente: 'Aline Valdez', total: 252.10, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38627, dia: 4, hora: 12, min: 49, cliente: 'Emilly De Oliveira', total: 228.79, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38626, dia: 4, hora: 12, min: 36, cliente: 'Tarcila Ellen Silva Eidt', total: 188.79, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38625, dia: 4, hora: 12, min: 34, cliente: 'Daniela Bocchi', total: 297.33, qtdItens: 2, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38624, dia: 4, hora: 11, min: 29, cliente: 'Mariana Rodrigues', total: 95.96, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38623, dia: 4, hora: 11, min: 14, cliente: 'Camila Nepomuceno', total: 140.73, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  // 3 jun
  { numero: 38622, dia: 3, hora: 23, min: 41, cliente: 'Vitória Moraes', total: 185.11, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38621, dia: 3, hora: 21, min: 41, cliente: 'Luisa Valencia', total: 329.61, qtdItens: 2, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38620, dia: 3, hora: 21, min: 13, cliente: 'Vitoria Ferreira', total: 260.88, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38619, dia: 3, hora: 19, min: 50, cliente: 'Taay Costa', total: 196.86, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38618, dia: 3, hora: 19, min: 41, cliente: 'Ilka Beatriz Silva', total: 161.40, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38617, dia: 3, hora: 19, min: 9, cliente: 'Ericka Machado', total: 159.90, qtdItens: 1, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38616, dia: 3, hora: 18, min: 8, cliente: 'Natasha Santos', total: 348.46, qtdItens: 2, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38615, dia: 3, hora: 17, min: 11, cliente: 'Deborah Araújo', total: 316.78, qtdItens: 2, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38614, dia: 3, hora: 16, min: 41, cliente: 'Beatriz Galli', total: 123.46, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38613, dia: 3, hora: 16, min: 35, cliente: 'Raphaella Soledade', total: 172.91, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38612, dia: 3, hora: 16, min: 1, cliente: 'Ellen Sa', total: 112.90, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38611, dia: 3, hora: 15, min: 56, cliente: 'Beatriz Zaleschi', total: 226.78, qtdItens: 2, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38609, dia: 3, hora: 14, min: 49, cliente: 'Rayani Freitas Leal', total: 419.80, qtdItens: 2, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38608, dia: 3, hora: 14, min: 40, cliente: 'Marina Luísa', total: 177.49, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38606, dia: 3, hora: 13, min: 59, cliente: 'Beatriz Chiliani', total: 259.06, qtdItens: 3, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38605, dia: 3, hora: 13, min: 5, cliente: 'Nicoly Entler', total: 259.90, qtdItens: 1, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38604, dia: 3, hora: 12, min: 55, cliente: 'Larissa Martins', total: 188.79, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38603, dia: 3, hora: 11, min: 47, cliente: 'Railane Sepulcrho Maciel', total: 341.81, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38602, dia: 3, hora: 11, min: 32, cliente: 'Giovanna Lambert Maellaro', total: 159.90, qtdItens: 1, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38601, dia: 3, hora: 9, min: 41, cliente: 'Luana Ferreira', total: 259.90, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38600, dia: 3, hora: 9, min: 17, cliente: 'Michelle Barbosa', total: 904.27, qtdItens: 7, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  // 2 jun
  { numero: 38598, dia: 2, hora: 23, min: 7, cliente: 'Jéssica Dos Santos', total: 379.28, qtdItens: 3, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38597, dia: 2, hora: 23, min: 2, cliente: 'Gessica Larissa', total: 102.74, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38596, dia: 2, hora: 21, min: 54, cliente: 'Natalia Ribeiro Resenti', total: 153.34, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38595, dia: 2, hora: 20, min: 49, cliente: 'Ketlyn Man', total: 162.59, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38594, dia: 2, hora: 20, min: 17, cliente: 'Gabriela Nardo Santa Rosa', total: 332.31, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38593, dia: 2, hora: 20, min: 12, cliente: 'Rebecca Minucci', total: 254.91, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38592, dia: 2, hora: 20, min: 7, cliente: 'Ana Carolina Silva', total: 246.90, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38591, dia: 2, hora: 19, min: 0, cliente: 'Thaina Aguiar', total: 209.86, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38590, dia: 2, hora: 18, min: 57, cliente: 'Luanna Barros', total: 406.80, qtdItens: 2, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38588, dia: 2, hora: 18, min: 51, cliente: 'Pamela Zeferino', total: 493.20, qtdItens: 8, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38587, dia: 2, hora: 17, min: 52, cliente: 'Gabrielly De Freitas', total: 159.93, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38585, dia: 2, hora: 16, min: 41, cliente: 'Henrique Do Nascimento Santos', total: 189.90, qtdItens: 1, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38584, dia: 2, hora: 14, min: 43, cliente: 'Letícia Gonzalez', total: 254.64, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38583, dia: 2, hora: 14, min: 28, cliente: 'Gabrielle Gomes', total: 131.23, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38582, dia: 2, hora: 14, min: 7, cliente: 'Vitória Carvalho', total: 129.90, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38581, dia: 2, hora: 12, min: 59, cliente: 'Luana Monteiro', total: 123.40, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38580, dia: 2, hora: 12, min: 30, cliente: 'Vitória Carvalho', total: 239.49, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38579, dia: 2, hora: 12, min: 21, cliente: 'Leticia Barcarol', total: 313.31, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38576, dia: 2, hora: 10, min: 17, cliente: 'Kelorin Aparecida Ferrando', total: 238.79, qtdItens: 1, meio: 'cash', gateway: 'cash', status: 'paid' },
  { numero: 38573, dia: 2, hora: 10, min: 9, cliente: 'Rafaela Medeiros', total: 218.21, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38572, dia: 2, hora: 9, min: 46, cliente: 'Maria Guassi Ajudarte Lopes', total: 192.32, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38571, dia: 2, hora: 8, min: 55, cliente: 'Thayna Carvalho', total: 122.12, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38570, dia: 2, hora: 8, min: 49, cliente: 'Julia Portela', total: 172.23, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38569, dia: 2, hora: 8, min: 31, cliente: 'Rayana Gusmao Da Costa Oliveira', total: 342.70, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38568, dia: 2, hora: 7, min: 29, cliente: 'Thaís Freitas', total: 146.44, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  // 1 jun
  { numero: 38566, dia: 1, hora: 22, min: 49, cliente: 'Luiza Malta', total: 189.90, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38565, dia: 1, hora: 22, min: 45, cliente: 'Camilla Tesser', total: 294.31, qtdItens: 2, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38560, dia: 1, hora: 15, min: 31, cliente: 'Julliah Alves Do Nascimento', total: 180.40, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38558, dia: 1, hora: 13, min: 42, cliente: 'Luryan Moraes', total: 246.95, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38557, dia: 1, hora: 13, min: 29, cliente: 'Julia Dias', total: 236.80, qtdItens: 2, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38556, dia: 1, hora: 13, min: 9, cliente: 'Yasmin Victoria Garcia', total: 49.54, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38555, dia: 1, hora: 12, min: 55, cliente: 'Luana Teixeira', total: 217.23, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38554, dia: 1, hora: 11, min: 46, cliente: 'Izabella Valadares', total: 277.99, qtdItens: 1, meio: 'pix', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38553, dia: 1, hora: 11, min: 26, cliente: 'Afeni Gizeli De Almeida Silva', total: 137.23, qtdItens: 1, meio: 'credit_card', gateway: 'nuvem_pago', status: 'refunded_partial' },
  { numero: 38552, dia: 1, hora: 8, min: 9, cliente: 'Camilla Santos', total: 467.16, qtdItens: 4, meio: 'credit_card', gateway: 'nuvem_pago', status: 'paid' },
  { numero: 38551, dia: 1, hora: 1, min: 48, cliente: 'Alana Tomich', total: 382.33, qtdItens: 2, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
  { numero: 38550, dia: 1, hora: 0, min: 22, cliente: 'Isabella Dias Fantin', total: 153.02, qtdItens: 1, meio: 'credit_card', gateway: 'mercado_pago', status: 'paid' },
];

// Taxas dos gateways
function calcularTaxaGateway(p: Pedido): number {
  if (p.gateway === 'cash' || p.status === 'cancelled') return 0;
  switch (p.gateway) {
    case 'nuvem_pago':
      if (p.meio === 'pix') return Math.round(p.total * 0.99) / 100;
      if (p.meio === 'boleto') return 2.39;
      return Math.round(p.total * 2.99) / 100 + 0.35; // cartão
    case 'mercado_pago':
      if (p.meio === 'pix') return Math.round(p.total * 0.99) / 100;
      if (p.meio === 'boleto') return 2.39;
      return Math.round(p.total * 4.49) / 100 + 0.35; // cartão (14 dias)
  }
  return 0;
}

async function main() {
  // 1) Limpa pedidos antigos (seed e qualquer outro)
  console.log('[seed-real] Limpando pedidos antigos...');
  const r = await sql`DELETE FROM pedidos`;
  console.log(`[seed-real] ${(r as any).rowCount ?? 0} pedidos antigos removidos`);

  // 2) Ajusta schema pra ter gateway
  await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS gateway text`;

  // 3) Carrega config
  const [cfg] = await sql`SELECT taxa_nuvemshop_percent, custo_embalagem, custo_frete_medio FROM configuracoes WHERE id = 1`;
  const taxaNuvem = Number(cfg?.taxa_nuvemshop_percent ?? 0.7);
  const custoEmbalagem = Number(cfg?.custo_embalagem ?? 3);
  const custoFrete = Number(cfg?.custo_frete_medio ?? 25);

  // 4) Insere pedidos reais
  console.log(`[seed-real] Inserindo ${PEDIDOS.length} pedidos reais de junho...`);
  let salvos = 0, receita = 0, lucroAgg = 0;

  for (const p of PEDIDOS) {
    const data = new Date(2026, 5, p.dia, p.hora, p.min, 0); // junho = mês 5 (0-indexed)
    const id = `ns_${p.numero}`;

    const taxaGw = calcularTaxaGateway(p);
    const taxaNs = p.status === 'cancelled' ? 0 : Math.round(p.total * taxaNuvem) / 100;
    const cogs = 0; // sem COGS cadastrado ainda
    const embalagem = p.status === 'cancelled' ? 0 : custoEmbalagem;
    const fretePedido = p.status === 'cancelled' ? 0 : (p.gateway === 'cash' ? 0 : custoFrete);

    const lucro = p.status === 'cancelled' ? 0 : p.total - taxaGw - taxaNs - cogs - embalagem - fretePedido;
    const margem = p.total > 0 ? (lucro / p.total) * 100 : 0;

    await sql`
      INSERT INTO pedidos (
        id, numero, cliente_nome, status, data_pedido,
        subtotal, desconto, frete_cobrado, total, meio_pagamento, parcelas, gateway,
        taxa_gateway, taxa_nuvemshop, cogs_total, custo_embalagem, custo_frete,
        lucro_liquido, margem_percent, itens, recalculado_em, sincronizado_em
      ) VALUES (
        ${id}, ${p.numero}, ${p.cliente}, ${p.status}, ${data.toISOString()},
        ${p.total}, ${0}, ${0}, ${p.total}, ${p.meio}, ${null}, ${p.gateway},
        ${taxaGw}, ${taxaNs}, ${cogs}, ${embalagem}, ${fretePedido},
        ${lucro}, ${margem.toFixed(2)}, ${JSON.stringify([])}::jsonb,
        NOW(), NOW()
      )
    `;
    salvos++;
    if (p.status === 'paid' || p.status === 'refunded_partial') {
      receita += p.total;
      lucroAgg += lucro;
    }
  }

  console.log(`[seed-real] ${salvos} pedidos inseridos`);

  // 5) Stats
  const stats = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('paid', 'refunded_partial'))::int AS pedidos_validos,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelados,
      COALESCE(SUM(total) FILTER (WHERE status IN ('paid', 'refunded_partial')), 0)::numeric AS receita,
      COALESCE(SUM(lucro_liquido) FILTER (WHERE status IN ('paid', 'refunded_partial')), 0)::numeric AS lucro,
      COALESCE(AVG(total) FILTER (WHERE status IN ('paid', 'refunded_partial')), 0)::numeric AS ticket
    FROM pedidos
  `;
  console.log('\n[seed-real] Junho 01-08:');
  console.log(`  Pedidos válidos: ${stats[0].pedidos_validos}`);
  console.log(`  Cancelados/recusados: ${stats[0].cancelados}`);
  console.log(`  Receita total: R$ ${Number(stats[0].receita).toFixed(2)}`);
  console.log(`  Lucro líquido (COGS=0): R$ ${Number(stats[0].lucro).toFixed(2)}`);
  console.log(`  Ticket médio: R$ ${Number(stats[0].ticket).toFixed(2)}`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
