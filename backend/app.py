from __future__ import annotations

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import settings
from database.db import init_db
from routes.auth_routes import auth_bp
from routes.advisory_routes import advisory_bp
from routes.crop_routes import crop_bp
from routes.disease_routes import disease_bp
from routes.irrigation_routes import irrigation_bp
from routes.market_routes import market_bp
from routes.system_routes import system_bp
from utils.logger import setup_logging


def create_app() -> Flask:
    setup_logging()
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"] = settings.jwt_secret_key
    CORS(app, resources={r"/api/*": {"origins": settings.cors_origins}})

    JWTManager(app)
    init_db()

    app.register_blueprint(auth_bp)
    app.register_blueprint(advisory_bp)
    app.register_blueprint(crop_bp)
    app.register_blueprint(disease_bp)
    app.register_blueprint(irrigation_bp)
    app.register_blueprint(market_bp)
    app.register_blueprint(system_bp)

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"}), 200

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host=settings.host, port=settings.port, debug=settings.debug)
