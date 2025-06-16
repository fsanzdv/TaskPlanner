const axios = require('axios');
const logger = require('../config/logger');

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutos
  }

  // Obtener clima actual por ciudad
  async getCurrentWeather(city) {
    try {
      if (!this.apiKey) {
        logger.warn('API Key de OpenWeatherMap no configurada');
        return null;
      }

      // Verificar cache
      const cacheKey = `current_${city.toLowerCase()}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric',
          lang: 'es'
        },
        timeout: 5000
      });

      const weatherData = {
        temperature: Math.round(response.data.main.temp),
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind?.speed || 0,
        pressure: response.data.main.pressure,
        fetchedAt: new Date()
      };

      // Guardar en cache
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      logger.info(`Clima obtenido para ${city}: ${weatherData.temperature}°C`);
      return weatherData;

    } catch (error) {
      logger.error(`Error al obtener clima para ${city}:`, error.message);
      return null;
    }
  }

  // Obtener pronóstico por ciudad y fecha
  async getWeatherByCity(city, date = new Date()) {
    try {
      if (!this.apiKey) {
        logger.warn('API Key de OpenWeatherMap no configurada');
        return null;
      }

      const targetDate = new Date(date);
      const today = new Date();
      const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

      // Si es para hoy o el pasado, usar clima actual
      if (diffDays <= 0) {
        return await this.getCurrentWeather(city);
      }

      // Si es para los próximos 5 días, usar forecast
      if (diffDays <= 5) {
        return await this.getForecastWeather(city, targetDate);
      }

      // Para fechas muy lejanas, usar clima actual como aproximación
      logger.warn(`Fecha muy lejana para pronóstico (${diffDays} días), usando clima actual`);
      return await this.getCurrentWeather(city);

    } catch (error) {
      logger.error(`Error al obtener clima para ${city} en fecha ${date}:`, error.message);
      return null;
    }
  }

  // Obtener pronóstico de 5 días
  async getForecastWeather(city, targetDate) {
    try {
      const cacheKey = `forecast_${city.toLowerCase()}_${targetDate.toDateString()}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric',
          lang: 'es'
        },
        timeout: 5000
      });

      // Buscar el pronóstico más cercano a la fecha objetivo
      const targetTimestamp = targetDate.getTime();
      let closestForecast = null;
      let minDiff = Infinity;

      response.data.list.forEach(forecast => {
        const forecastDate = new Date(forecast.dt * 1000);
        const diff = Math.abs(forecastDate.getTime() - targetTimestamp);
        
        if (diff < minDiff) {
          minDiff = diff;
          closestForecast = forecast;
        }
      });

      if (!closestForecast) {
        logger.warn(`No se encontró pronóstico para ${city} en la fecha solicitada`);
        return await this.getCurrentWeather(city);
      }

      const weatherData = {
        temperature: Math.round(closestForecast.main.temp),
        description: closestForecast.weather[0].description,
        icon: closestForecast.weather[0].icon,
        humidity: closestForecast.main.humidity,
        windSpeed: closestForecast.wind?.speed || 0,
        pressure: closestForecast.main.pressure,
        fetchedAt: new Date()
      };

      // Guardar en cache
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      logger.info(`Pronóstico obtenido para ${city}: ${weatherData.temperature}°C`);
      return weatherData;

    } catch (error) {
      logger.error(`Error al obtener pronóstico para ${city}:`, error.message);
      // Fallback al clima actual
      return await this.getCurrentWeather(city);
    }
  }

  // Limpiar cache antiguo
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  // Verificar si el servicio está disponible
  isAvailable() {
    return !!this.apiKey;
  }

  // Obtener información de múltiples ciudades
  async getMultipleCitiesWeather(cities) {
    try {
      const promises = cities.map(city => this.getCurrentWeather(city));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => ({
        city: cities[index],
        weather: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }));
    } catch (error) {
      logger.error('Error al obtener clima de múltiples ciudades:', error);
      return [];
    }
  }
}

// Crear instancia única
const weatherService = new WeatherService();

// Limpiar cache cada 15 minutos
setInterval(() => {
  weatherService.cleanCache();
}, 15 * 60 * 1000);

module.exports = weatherService;