import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const COMMANDS = {
  HELP: '/help',
  ADD_INCOME: '/income',
  ADD_EXPENSE: '/expense',
  BALANCE: '/balance',
  SUMMARY: '/summary'
};

export const processChatCommand = async (userId, message) => {
  const parts = message.trim().split(' ');
  const command = parts[0].toLowerCase();

  try {
    switch (command) {
      case COMMANDS.HELP:
        return {
          type: 'help',
          message: `Available commands:
            ${COMMANDS.ADD_INCOME} <amount> <category> [description] - Add income
            ${COMMANDS.ADD_EXPENSE} <amount> <category> [description] - Add expense
            ${COMMANDS.BALANCE} - Check current balance
            ${COMMANDS.SUMMARY} - Get recent transactions summary
            ${COMMANDS.HELP} - Show this help message`
        };

      case COMMANDS.ADD_INCOME:
        return await addIncome(userId, parts);

      case COMMANDS.ADD_EXPENSE:
        return await addExpense(userId, parts);

      case COMMANDS.BALANCE:
        return await getBalance(userId);

      case COMMANDS.SUMMARY:
        return await getTransactionsSummary(userId);

      default:
        return {
          type: 'error',
          message: 'Unknown command. Type /help for available commands.'
        };
    }
  } catch (error) {
    return {
      type: 'error',
      message: error.message
    };
  }
};

async function addIncome(userId, parts) {
  if (parts.length < 3) {
    throw new Error('Usage: /income <amount> <category> [description]');
  }

  const amount = parseFloat(parts[1]);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const category = parts[2];
  const description = parts.slice(3).join(' ');

  const transaction = await Transaction.create({
    user: userId,
    type: 'income',
    amount,
    category,
    description
  });

  await User.findByIdAndUpdate(userId, { $inc: { balance: amount } });

  return {
    type: 'success',
    message: `Added income: $${amount} (${category})`,
    data: transaction
  };
}

async function addExpense(userId, parts) {
  if (parts.length < 3) {
    throw new Error('Usage: /expense <amount> <category> [description]');
  }

  const amount = parseFloat(parts[1]);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const category = parts[2];
  const description = parts.slice(3).join(' ');

  const user = await User.findById(userId);
  if (user.balance < amount) {
    throw new Error('Insufficient balance');
  }

  const transaction = await Transaction.create({
    user: userId,
    type: 'expense',
    amount,
    category,
    description
  });

  await User.findByIdAndUpdate(userId, { $inc: { balance: -amount } });

  return {
    type: 'success',
    message: `Added expense: $${amount} (${category})`,
    data: transaction
  };
}

async function getBalance(userId) {
  const user = await User.findById(userId);
  return {
    type: 'info',
    message: `Current balance: $${user.balance.toFixed(2)}`
  };
}

async function getTransactionsSummary(userId) {
  const transactions = await Transaction.find({ user: userId })
    .sort({ date: -1 })
    .limit(5);

  const summary = transactions.map(t => {
    return `${t.type === 'income' ? '+' : '-'}$${t.amount} (${t.category}) - ${t.description || 'No description'}`;
  }).join('\n');

  return {
    type: 'info',
    message: `Recent transactions:\n${summary}`,
    data: transactions
  };
} 