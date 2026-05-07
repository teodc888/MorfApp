using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantOwnerAndPlan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "owner_name",
                table: "tenants",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "owner_phone",
                table: "tenants",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "plan",
                table: "tenants",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "owner_name",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "owner_phone",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "plan",
                table: "tenants");
        }
    }
}
