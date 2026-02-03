"""
Logging utilities for DeepResearch Platform.

Provides centralized logging configuration with:
- Console output with colors (development)
- File rotation by day (production)
- Separate error log file
- Structured log format with source location
- Async logging support
"""

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional


# Color codes for console output
class ColorCodes:
    """ANSI color codes for terminal output."""
    RESET = '\033[0m'
    BOLD = '\033[1m'
    
    # Log level colors
    DEBUG = '\033[36m'      # Cyan
    INFO = '\033[32m'       # Green
    WARNING = '\033[33m'    # Yellow
    ERROR = '\033[31m'      # Red
    CRITICAL = '\033[35m'   # Magenta
    
    # Component colors
    TIMESTAMP = '\033[90m'  # Gray
    MODULE = '\033[94m'     # Blue


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for console output."""
    
    def __init__(self, fmt: str, use_colors: bool = True):
        super().__init__(fmt)
        self.use_colors = use_colors and sys.platform != 'win32'
    
    def format(self, record: logging.LogRecord) -> str:
        if not self.use_colors:
            return super().format(record)
        
        # Save original values
        original_levelname = record.levelname
        original_name = record.name
        
        # Apply colors
        level_color = getattr(ColorCodes, record.levelname, ColorCodes.RESET)
        record.levelname = f"{ColorCodes.BOLD}{level_color}{record.levelname:8}{ColorCodes.RESET}"
        record.name = f"{ColorCodes.MODULE}{record.name}{ColorCodes.RESET}"
        
        # Format the message
        formatted = super().format(record)
        
        # Restore original values
        record.levelname = original_levelname
        record.name = original_name
        
        return formatted


class StructuredFormatter(logging.Formatter):
    """Structured formatter for file output with detailed information."""
    
    def format(self, record: logging.LogRecord) -> str:
        # Ensure exc_info is formatted
        if record.exc_info:
            record.exc_text = self.formatException(record.exc_info)
        
        # Build structured message
        parts = [
            self.formatTime(record),
            f"{record.levelname:8}",
            f"{record.name}:{record.funcName}:{record.lineno}",
            record.getMessage()
        ]
        
        # Add exception info if present
        if record.exc_text:
            parts.append(f"\n{record.exc_text}")
        
        return " | ".join(parts)
    
    def formatTime(self, record: logging.LogRecord, datefmt: Optional[str] = None) -> str:
        """Format timestamp with milliseconds."""
        ct = datetime.fromtimestamp(record.created)
        if datefmt:
            return ct.strftime(datefmt)
        return ct.strftime("%Y-%m-%d %H:%M:%S") + f",{int(record.msecs):03d}"


def setup_logging(
    log_dir: Optional[str] = None,
    log_level: str = "INFO",
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 30,
    console_output: bool = True
) -> logging.Logger:
    """
    Setup centralized logging configuration.
    
    Args:
        log_dir: Directory for log files (default: project_root/log)
        log_level: Minimum log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)
        max_bytes: Maximum bytes per log file before rotation
        backup_count: Number of backup files to keep
        console_output: Whether to output to console
    
    Returns:
        Root logger instance
    """
    # Determine log directory
    if log_dir is None:
        # Get project root (parent of backend directory)
        backend_dir = Path(__file__).parent.parent
        project_root = backend_dir.parent
        log_dir = project_root / "log"
    else:
        log_dir = Path(log_dir)
    
    # Create log directory if not exists
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    root_logger.handlers.clear()
    
    # Console handler (with colors)
    if console_output:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        console_format = "%(asctime)s | %(levelname)s | %(name)s:%(funcName)s:%(lineno)d | %(message)s"
        console_formatter = ColoredFormatter(console_format, use_colors=True)
        console_handler.setFormatter(console_formatter)
        root_logger.addHandler(console_handler)
    
    # File handler for all logs (rotating)
    app_log_path = log_dir / "app.log"
    file_handler = logging.handlers.RotatingFileHandler(
        app_log_path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_formatter = StructuredFormatter()
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)
    
    # File handler for errors only
    error_log_path = log_dir / "error.log"
    error_handler = logging.handlers.RotatingFileHandler(
        error_log_path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_formatter = StructuredFormatter()
    error_handler.setFormatter(error_formatter)
    root_logger.addHandler(error_handler)
    
    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info(f"Logging initialized: log_dir={log_dir}, level={log_level}")
    logger.info(f"App log: {app_log_path}")
    logger.info(f"Error log: {error_log_path}")
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        Logger instance
    """
    return logging.getLogger(name)


# Convenience functions for quick logging
def debug(msg: str, *args, **kwargs):
    """Log debug message."""
    logging.getLogger(__name__).debug(msg, *args, **kwargs)


def info(msg: str, *args, **kwargs):
    """Log info message."""
    logging.getLogger(__name__).info(msg, *args, **kwargs)


def warning(msg: str, *args, **kwargs):
    """Log warning message."""
    logging.getLogger(__name__).warning(msg, *args, **kwargs)


def error(msg: str, *args, **kwargs):
    """Log error message."""
    logging.getLogger(__name__).error(msg, *args, **kwargs)


def critical(msg: str, *args, **kwargs):
    """Log critical message."""
    logging.getLogger(__name__).critical(msg, *args, **kwargs)


def exception(msg: str, *args, **kwargs):
    """Log exception with traceback."""
    logging.getLogger(__name__).exception(msg, *args, **kwargs)


class LogContext:
    """
    Context manager for temporary log level changes.
    
    Example:
        with LogContext(level=logging.DEBUG):
            # Debug logging enabled temporarily
            do_something()
    """
    
    def __init__(self, level: int = logging.DEBUG, logger: Optional[logging.Logger] = None):
        self.level = level
        self.logger = logger or logging.getLogger()
        self.original_level = self.logger.level
    
    def __enter__(self):
        self.logger.setLevel(self.level)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.logger.setLevel(self.original_level)
        return False


# Performance logging decorator
def log_execution_time(logger_name: Optional[str] = None, level: int = logging.DEBUG):
    """
    Decorator to log function execution time.
    
    Example:
        @log_execution_time()
        def my_function():
            pass
    """
    def decorator(func):
        logger = logging.getLogger(logger_name or func.__module__)
        
        def wrapper(*args, **kwargs):
            import time
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                elapsed = time.time() - start_time
                logger.log(level, f"{func.__name__} executed in {elapsed:.3f}s")
                return result
            except Exception as e:
                elapsed = time.time() - start_time
                logger.error(f"{func.__name__} failed after {elapsed:.3f}s: {e}")
                raise
        
        return wrapper
    return decorator
