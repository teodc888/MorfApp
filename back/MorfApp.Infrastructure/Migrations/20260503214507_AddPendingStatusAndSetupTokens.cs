using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingStatusAndSetupTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "owner_email",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "setup_tokens",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    admin_user_id = table.Column<string>(type: "text", nullable: false),
                    token = table.Column<string>(type: "text", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_used = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_setup_tokens", x => x.id);
                    table.ForeignKey(
                        name: "fk_setup_tokens_admin_users_admin_user_id",
                        column: x => x.admin_user_id,
                        principalTable: "admin_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_setup_tokens_admin_user_id",
                table: "setup_tokens",
                column: "admin_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_setup_tokens_token",
                table: "setup_tokens",
                column: "token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "setup_tokens");

            migrationBuilder.DropColumn(
                name: "owner_email",
                table: "tenants");
        }
    }
}
