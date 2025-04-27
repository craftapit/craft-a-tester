import * as winston from 'winston';

export class Logger {
  private logger: winston.Logger;
  
  constructor(name: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.label({ label: name }),
        winston.format.printf(({ level, message, label, timestamp }) => {
          return `${timestamp} [${label}] ${level}: ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }
  
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
  
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }
  
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }
  
  error(message: string, error?: any): void {
    if (error instanceof Error) {
      this.logger.error(`${message}: ${error.message}`, { stack: error.stack });
    } else {
      this.logger.error(message, error);
    }
  }
}
